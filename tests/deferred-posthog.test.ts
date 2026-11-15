import { createHash } from 'node:crypto';
import ts from 'typescript';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import baseline from './fixtures/posthog-before.json';

type Call = unknown[];
const firstTouch = {
  first_touch_utm_source: 'google',
  first_touch_referrer: 'https://www.google.com/search?q=gelato',
  first_touch_referring_domain: 'www.google.com',
  first_touch_pathname: '/courses/vibecoding',
};
const lesson = { course: 'vibecoding', lesson: 1, target: 'next_lesson', to_lesson: 2 };
const pageview = { $current_url: 'https://gelato.education/courses/vibecoding' };
const expected: Call[] = [
  ['capture', 'lesson_next_click', lesson],
  ['identify', 'visitor-509', { source: 'lesson' }],
  ['capture', '$pageview', pageview],
  ['reset'],
  ['capture', 'after_ready', { count: 1 }],
];

function emitEarly(client: {
  track: (name: string, props?: Record<string, unknown>) => void;
  identify: (uid: string, props?: Record<string, unknown>) => void;
  resetAnalytics: () => void;
}) {
  client.track('lesson_next_click', lesson);
  client.identify('visitor-509', { source: 'lesson' });
  client.track('$pageview', pageview);
  client.resetAnalytics();
}

function assertDelivery(calls: Call[]) {
  expect(calls.filter(([name]) => ['capture', 'identify', 'reset'].includes(String(name)))).toEqual(expected);
}

function mockSdk() {
  const calls: Call[] = [];
  const properties: Record<string, unknown> = {};
  const events: Call[] = [];
  const sdk = {
    __loaded: false,
    init: vi.fn((...args: unknown[]) => { sdk.__loaded = true; calls.push(['init', ...args]); }),
    register_once: vi.fn((props: Record<string, unknown>) => {
      Object.assign(properties, props); calls.push(['register_once', props]);
    }),
    register: vi.fn((props: Record<string, unknown>) => {
      Object.assign(properties, props); calls.push(['register', props]);
    }),
    capture: vi.fn((...args: unknown[]) => {
      calls.push(['capture', ...args]); events.push([args[0], { ...properties, ...args[1] as object }]);
    }),
    identify: vi.fn((...args: unknown[]) => { calls.push(['identify', ...args]); }),
    reset: vi.fn((...args: unknown[]) => { calls.push(['reset', ...args]); }),
    get_distinct_id: vi.fn(() => 'visitor-509'),
  };
  return { sdk, calls, events };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
  vi.stubGlobal('window', { location: new URL('https://gelato.education/courses/vibecoding?utm_source=google') });
  vi.stubGlobal('document', { referrer: firstTouch.first_touch_referrer });
});

afterEach(() => {
  vi.doUnmock('posthog-js');
  vi.doUnmock('react');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it('delivers calls made before and during SDK loading, unchanged and in order after init', async () => {
  const { sdk, calls, events } = mockSdk();
  let release!: (value: { default: typeof sdk }) => void;
  const module = new Promise<{ default: typeof sdk }>(resolve => { release = resolve; });
  const load = vi.fn(() => module);
  vi.doMock('posthog-js', load);
  const client = await import('@/lib/analytics/track-client');
  const { default: posthog } = await import('@/lib/analytics/posthog');
  posthog.register({ home_variant: 'control' });
  client.track('lesson_next_click', lesson);
  expect(load).not.toHaveBeenCalled();
  const loading = posthog.init('test-key', { defaults: '2025-05-24' }, firstTouch);
  expect(posthog.init('test-key', {}, firstTouch)).toBe(loading);
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  client.identify('visitor-509', { source: 'lesson' });
  client.track('$pageview', pageview);
  client.resetAnalytics();
  expect(calls).toEqual([]);
  release({ default: sdk });
  await loading;
  client.track('after_ready', { count: 1 });
  assertDelivery(calls);
  expect(calls.slice(0, 3)).toEqual([
    ['init', 'test-key', { defaults: '2025-05-24' }],
    ['register_once', firstTouch], ['register', { home_variant: 'control' }],
  ]);
  expect(events[0]).toEqual(['lesson_next_click', { ...firstTouch, home_variant: 'control', ...lesson }]);
  expect(events[1]).toEqual(['$pageview', { ...firstTouch, home_variant: 'control', ...pageview }]);
  expect(posthog.__loaded).toBe(true);
  expect(posthog.get_distinct_id()).toBe('visitor-509');
  await posthog.init('test-key', {}, firstTouch);
  expect(sdk.init).toHaveBeenCalledTimes(1);
});

it('waits for paint, survives StrictMode cleanup, and keeps the original attribution and pageview defaults', async () => {
  vi.useFakeTimers();
  const { sdk } = mockSdk();
  const load = vi.fn(() => ({ default: sdk }));
  vi.doMock('posthog-js', load);
  const effects: (() => void | (() => void))[] = [];
  vi.doMock('react', async () => ({
    ...await vi.importActual<typeof import('react')>('react'),
    useEffect: (effect: () => void | (() => void)) => { effects.push(effect); },
  }));
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = id => { frames.delete(id); };
  const { PostHogProvider } = await import('@/lib/analytics/posthog-client');
  PostHogProvider({ children: null });
  expect(load).not.toHaveBeenCalled();
  const cleanup = effects[0]();
  if (cleanup) cleanup();
  const cleanupAgain = effects[0]();
  expect(frames.size).toBe(1);
  expect(load).not.toHaveBeenCalled();
  Object.assign(window, { location: new URL('https://gelato.education/blog/vaybkoding-chto-eto') });
  for (const callback of frames.values()) callback(0);
  expect(load).not.toHaveBeenCalled(); // rAF itself runs before paint.
  await vi.runAllTimersAsync();
  await vi.dynamicImportSettled();
  expect(load).toHaveBeenCalledTimes(1);
  expect(sdk.register_once).toHaveBeenCalledExactlyOnceWith(firstTouch);
  expect(sdk.init).toHaveBeenCalledTimes(1);
  const config = sdk.init.mock.calls[0][1] as { defaults: string; capture_pageview?: unknown; before_send: (event: object) => unknown };
  expect(config.defaults).toBe('2025-05-24');
  expect(config.capture_pageview).toBeUndefined(); // SDK still owns automatic/history pageviews.
  const event = { event: '$pageview', properties: pageview };
  expect(config.before_send(event)).toBe(event);
  Object.assign(window, { location: new URL('https://gelato.education/admin') });
  expect(config.before_send(event)).toBeNull();
  if (cleanupAgain) cleanupAgain();
});

it('rejects the frozen old track-client with exactly the same delivery assertion', () => {
  expect(createHash('sha256').update(baseline.source).digest('hex')).toBe(baseline.sha256);
  expect(baseline.commit).toBe('c44a558ee51a89e0b86ee8ad12055660c6b70a49');
  const { sdk, calls } = mockSdk();
  const js = ts.transpile(baseline.source, { module: ts.ModuleKind.CommonJS });
  const exports: Record<string, unknown> = {};
  // Only this literal fixture is executed. There are no Git or origin reads.
  new Function('require', 'exports', js)(() => ({ default: sdk }), exports);
  const old = exports as unknown as Parameters<typeof emitEarly>[0];
  emitEarly(old);
  sdk.init('test-key');
  old.track('after_ready', { count: 1 });
  let oldFails = 0;
  try { assertDelivery(calls); } catch { oldFails++; }
  console.log(`OLD_FAILS=${oldFails}`);
  expect(oldFails).toBe(1);
});
