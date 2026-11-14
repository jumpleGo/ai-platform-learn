import { Children, isValidElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FreeLessonAnalytics } from '@/components/free-lesson-analytics';
import { NextLessonLink } from '@/components/next-lesson-link';
import { AgentsIntroNextStep } from '@/components/agents-intro-next-step';

const sdk = vi.hoisted(() => ({
  properties: {} as Record<string, string>,
  events: [] as { event: string; properties: Record<string, unknown> }[],
  init: vi.fn(),
  register_once: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: { __loaded: true, init: sdk.init, register_once: sdk.register_once, capture: sdk.capture },
}));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void) => effect(),
}));

function visit(url: string, referrer = '') {
  vi.stubGlobal('window', { location: new URL(url), innerWidth: 1280 });
  vi.stubGlobal('document', { referrer });
}

async function initialize() {
  const { PostHogProvider } = await import('@/lib/analytics/posthog-client');
  PostHogProvider({ children: null });
}

const FIRST_TOUCH = {
  first_touch_utm_source: 'google',
  first_touch_referrer: 'https://www.google.com/search?q=gelato',
  first_touch_referring_domain: 'www.google.com',
  first_touch_pathname: '/free',
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sdk.properties = {};
  sdk.events = [];
  // Model SDK persistence across page loads; register_once never replaces a set key.
  sdk.register_once.mockImplementation((properties: Record<string, string>) => {
    for (const [key, value] of Object.entries(properties)) {
      if (!(key in sdk.properties)) sdk.properties[key] = value;
    }
  });
  sdk.capture.mockImplementation((event: string, properties: Record<string, unknown>) => {
    sdk.events.push({ event, properties: { ...sdk.properties, ...properties } });
  });
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
  visit('https://gelato.education/free?utm_source=google', FIRST_TOUCH.first_touch_referrer);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('registers all four first-touch super properties once, immediately after init', async () => {
  await initialize();
  await initialize(); // StrictMode / provider rerender, same module.
  expect(sdk.init).toHaveBeenCalledTimes(1);
  expect(sdk.register_once).toHaveBeenCalledExactlyOnceWith(FIRST_TOUCH);
  expect(sdk.init.mock.invocationCallOrder[0]).toBeLessThan(sdk.register_once.mock.invocationCallOrder[0]);
});

it('preserves the first visit across a second init with another URL and referrer', async () => {
  await initialize();
  vi.resetModules(); // New page load, same persisted PostHog properties.
  visit('https://gelato.education/courses/vibecoding/lessons/2?utm_source=yandex', 'https://yandex.ru/search/');
  await initialize();
  expect(sdk.init).toHaveBeenCalledTimes(2);
  expect(sdk.register_once).toHaveBeenCalledTimes(2);
  expect(sdk.register_once).toHaveBeenLastCalledWith({
    first_touch_utm_source: 'yandex',
    first_touch_referrer: 'https://yandex.ru/search/',
    first_touch_referring_domain: 'yandex.ru',
    first_touch_pathname: '/courses/vibecoding/lessons/2',
  });
  expect(sdk.properties).toEqual(FIRST_TOUCH);
});

it.each(['', '?utm_source='])('records an absent or empty UTM as (none): %s', async query => {
  visit(`https://gelato.education/free${query}`);
  await initialize();
  const direct = {
    first_touch_utm_source: '(none)',
    first_touch_referrer: '(none)',
    first_touch_referring_domain: '(none)',
    first_touch_pathname: '/free',
  };
  expect(sdk.register_once).toHaveBeenCalledExactlyOnceWith(direct);
  vi.resetModules();
  visit('https://gelato.education/?utm_source=google', 'https://www.google.com/');
  await initialize();
  expect(sdk.properties).toEqual(direct);
});

it('does not interrupt initialization when the referrer cannot be parsed', async () => {
  visit('https://gelato.education/free', 'invalid referrer');
  await initialize();
  expect(sdk.register_once).toHaveBeenCalledExactlyOnceWith({
    first_touch_utm_source: '(none)',
    first_touch_referrer: 'invalid referrer',
    first_touch_referring_domain: '(none)',
    first_touch_pathname: '/free',
  });
});

it.each(['http://localhost/free', 'https://gelato.education/admin'])('keeps tracking disabled at %s', async url => {
  visit(url);
  await initialize();
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.register_once).not.toHaveBeenCalled();
});

it('does nothing without a public key or browser globals', async () => {
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
  await initialize();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  await initialize();
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.register_once).not.toHaveBeenCalled();
});

// Frozen capture payload bytes from 9ac6ccc. No Git or baseline worktree reads.
const OLD_PAYLOADS = [
  '{"courseId":"course-doc","lessonDocumentId":"lesson-doc","lesson_id":"vibecoding-1","source":"lesson-page","campaign":"intro","device":"desktop"}',
  '{"course":"vibecoding","lesson":1,"target":"next_lesson","to_lesson":2}',
  '{"course":"claude-code-agents","lesson":1,"target":"course"}',
];

function emitLessonEvents() {
  FreeLessonAnalytics({
    courseId: 'course-doc', lessonDocumentId: 'lesson-doc', lessonId: 'vibecoding-1',
    source: 'lesson-page', campaign: 'intro',
  });
  NextLessonLink({ courseSlug: 'vibecoding', fromLesson: 1, toLesson: 2, title: 'Урок 2' }).props.onClick();
  const link = Children.toArray(AgentsIntroNextStep().props.children).find(child =>
    isValidElement<{ onClick?: () => void }>(child) && child.props.onClick,
  );
  if (!isValidElement<{ onClick: () => void }>(link)) throw new Error('Missing next-step link');
  link.props.onClick();
}

it('keeps lesson_view and both lesson_next_click capture payloads byte-identical', async () => {
  await initialize();
  emitLessonEvents();
  expect(sdk.capture.mock.calls.map(([event]) => event)).toEqual([
    'lesson_view', 'lesson_next_click', 'lesson_next_click',
  ]);
  expect(sdk.capture.mock.calls.map(([, properties]) => JSON.stringify(properties))).toEqual(OLD_PAYLOADS);
});

it('carries first-touch properties onto lesson events through the SDK super properties', async () => {
  await initialize();
  emitLessonEvents();
  expect(sdk.events).toHaveLength(3);
  for (const [index, event] of sdk.events.entries()) {
    expect(event.properties).toEqual({ ...FIRST_TOUCH, ...JSON.parse(OLD_PAYLOADS[index]) });
  }
});
