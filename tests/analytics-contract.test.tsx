import { createHash } from 'node:crypto';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AgentsIntroNextStep } from '@/components/agents-intro-next-step';
import { FreeLessonAnalytics } from '@/components/free-lesson-analytics';
import { NextLessonLink } from '@/components/next-lesson-link';
import {
  ANALYTICS_CONTRACT, ANALYTICS_FIXTURES, assertEventContract, assertFirstTouchContract,
} from './analytics-contract';

const sdk = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  capture: vi.fn(),
  register_once: vi.fn(),
}));
const mounted = vi.hoisted(() => ({
  effects: [] as (() => void)[],
  links: new Map<string, () => void>(),
}));

vi.mock('posthog-js', () => ({ default: sdk }));
// The Node renderer has no mount phase: run each real effect after rendering.
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void) => { mounted.effects.push(effect); },
}));
// Keep the real components' handlers at the navigation boundary, without a router.
vi.mock('next/link', () => ({
  default: ({ href, onClick, children }: {
    href: string; onClick?: () => void; children?: ReactNode;
  }) => {
    if (onClick) mounted.links.set(href, onClick);
    return createElement('a', { href }, children);
  },
}));

function renderMounted(node: ReactNode) {
  const html = renderToStaticMarkup(node);
  for (const effect of mounted.effects.splice(0)) effect();
  return html;
}

async function initialize() {
  const { PostHogProvider } = await import('@/lib/analytics/posthog-client');
  renderMounted(<PostHogProvider>{null}</PostHogProvider>);
}

function click(href: string) {
  const handler = mounted.links.get(href);
  expect(handler, `rendered link ${href}`).toBeTypeOf('function');
  handler!();
}

function frozenProps(fixture: { json: string; sha256: string }): Record<string, unknown> {
  expect(createHash('sha256').update(fixture.json).digest('hex')).toBe(fixture.sha256);
  return JSON.parse(fixture.json);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mounted.effects.length = 0;
  mounted.links.clear();
  sdk.__loaded = false;
  sdk.init.mockImplementation(() => { sdk.__loaded = true; });
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'contract-test-key');
  vi.stubGlobal('window', {
    location: new URL(ANALYTICS_FIXTURES.firstTouch.url), innerWidth: 1280,
  });
  vi.stubGlobal('document', { referrer: ANALYTICS_FIXTURES.firstTouch.referrer });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each([[639, 'mobile'], [640, 'tablet'], [1023, 'tablet'], [1024, 'desktop']] as const)(
  'renders lesson_view with the required string properties at width %s', async (width, device) => {
    await initialize();
    vi.stubGlobal('window', {
      location: new URL(ANALYTICS_FIXTURES.firstTouch.url), innerWidth: width,
    });
    renderMounted(<FreeLessonAnalytics
      courseId="course-doc" lessonDocumentId="lesson-doc" lessonId="01"
      source="google" campaign="intro"
    />);
    expect(sdk.capture).toHaveBeenCalledExactlyOnceWith('lesson_view', {
      courseId: 'course-doc', lessonDocumentId: 'lesson-doc', lesson_id: '01',
      source: 'google', campaign: 'intro', device,
    });
    const [event, properties] = sdk.capture.mock.calls[0];
    assertEventContract(event, properties);
  },
);

it.each(['vibecoding', 'claude-code-agents'])(
  'distinguishes the intro click from %s lesson 1 → 2 at PostHog.capture', async courseSlug => {
    await initialize();
    renderMounted(<>
      <AgentsIntroNextStep />
      <NextLessonLink courseSlug={courseSlug} fromLesson={1} toLesson={2} title="Урок 2" />
    </>);
    expect(sdk.capture).not.toHaveBeenCalled();
    click('/courses/claude-code-agents');
    click(`/courses/${courseSlug}/lessons/2`);
    expect(sdk.capture.mock.calls).toEqual([
      ['lesson_next_click', { course: 'claude-code-agents', lesson: 1, target: 'course' }],
      ['lesson_next_click', { course: courseSlug, lesson: 1, target: 'next_lesson', to_lesson: 2 }],
    ]);
    for (const [event, properties] of sdk.capture.mock.calls) assertEventContract(event, properties);
  },
);

it('registers exactly the frozen first-touch keys and string values once after init', async () => {
  const properties = frozenProps(ANALYTICS_FIXTURES.firstTouch);
  await initialize();
  await initialize();
  expect(sdk.init).toHaveBeenCalledTimes(1);
  expect(sdk.register_once).toHaveBeenCalledExactlyOnceWith(properties);
  assertFirstTouchContract(sdk.register_once.mock.calls[0][0]);
  expect(sdk.init.mock.invocationCallOrder[0]).toBeLessThan(sdk.register_once.mock.invocationCallOrder[0]);
});

it('rejects the literal renamed #340 schema with the same event validator', () => {
  const properties = frozenProps(ANALYTICS_FIXTURES.broken340);
  expect(() => assertEventContract('lesson_next_click', properties)).toThrow(/required analytics keys/);
});

it.each(['lesson', 'to_lesson'] as const)('rejects a string-valued %s in lesson_next_click', key => {
  const properties = { course: 'vibecoding', lesson: 1, target: 'next_lesson', to_lesson: 2 };
  expect(() => assertEventContract('lesson_next_click', { ...properties, [key]: '2' }))
    .toThrow(`analytics property ${key}`);
});

it.each(ANALYTICS_CONTRACT.first_touch)('rejects a renamed first-touch field: %s', key => {
  const properties = frozenProps(ANALYTICS_FIXTURES.firstTouch);
  properties[key.replace('first_touch_', 'initial_')] = properties[key];
  delete properties[key];
  expect(() => assertFirstTouchContract(properties)).toThrow(/required analytics keys/);
});
