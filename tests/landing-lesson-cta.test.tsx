import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';
import type { CourseWithLessons } from '@/lib/db/courses';

const { catalog, links, track } = vi.hoisted(() => ({
  catalog: vi.fn(), links: new Map<string, React.ComponentProps<'a'>>(), track: vi.fn(),
}));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));
vi.mock('@/components/vibe-guest-cta', () => ({ VibeGuestCta: () => null }));
vi.mock('@/components/experiment-exposure', () => ({ ExperimentExposure: () => null }));
// Exercise both layouts independently of the live experiment's closed status.
vi.mock('@/lib/landing-blocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/landing-blocks')>();
  return {
    ...actual,
    pickAgentsBlocks: ({ forced }: { forced?: string | null }) => ({
      variant: forced ?? 'control', blocks: actual.agentsBlocksForVariant(forced ?? 'control'),
    }),
  };
});
vi.mock('@/lib/analytics/track-client', () => ({ track }));
vi.mock('next/link', () => ({ default: (props: React.ComponentProps<'a'>) => {
  if (props.href) links.set(props.href, props);
  return <a {...props} />;
} }));

beforeEach(() => { links.clear(); track.mockClear(); });

async function render(slug: string, numbers = [1], variant = 'control') {
  catalog.mockResolvedValue([{
    id: `document-${slug}`, slug, title: 'Курс', description: '', published: true,
    isTest: false, coverUrl: null, order: 1, access: 'paid',
    lessons: numbers.map((number) => ({
      id: `lesson-${number}`, number, title: 'Урок', access: 'paid', published: true,
    })),
  } as CourseWithLessons]);
  return renderToStaticMarkup(await CourseLandingPage({
    params: Promise.resolve({ courseSlug: slug }),
    searchParams: Promise.resolve({ exp_agents_landing_blocks: variant }),
  }));
}

it.each([
  ['vibecoding', 'control'], ['claude-code-agents', 'control'],
  ['claude-code-agents', 'core'], ['ai-cartoons', 'control'], ['another-course', 'control'],
])('renders one neutral lesson-1 CTA using route data (%s, %s)', async (slug, variant) => {
  const html = await render(slug, [2, 1], variant);
  const ctas = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter(([, , content]) => content.replace(/<[^>]*>/g, '').trim() === 'Начать с первого урока');
  expect(ctas).toHaveLength(1);
  expect(ctas[0][1]).toContain(`href="/courses/${slug}/lessons/1"`);
  expect(ctas[0][1]).not.toMatch(/\bhidden\b|\binvisible\b|display:\s*none/);
  expect(ctas[0][0]).not.toMatch(/бесплатн/iu);
  const programHeading = /<h2\b[^>]*>Программа\s+обучения<\/h2>/u;
  if (slug === 'vibecoding' || variant === 'core') expect(html).not.toMatch(programHeading);
  else expect(html).toMatch(programHeading);
  expect(track).not.toHaveBeenCalled();
});

it.each([{ numbers: [] }, { numbers: [2, 3] }])('omits the CTA when lesson 1 is absent ($numbers)', async ({ numbers }) => {
  const html = await render('another-course', numbers);
  expect(html).not.toContain('Начать с первого урока');
  expect(html).not.toContain('href="/courses/another-course/lessons/1"');
});

it('tracks exactly the course slug and lesson1 target on click', async () => {
  await render('another-course');
  const onClick = links.get('/courses/another-course/lessons/1')?.onClick;
  expect(onClick).toBeTypeOf('function');
  expect(track).not.toHaveBeenCalled();
  onClick!({} as React.MouseEvent<HTMLAnchorElement>);
  expect(track).toHaveBeenCalledExactlyOnceWith('landing_lesson_cta_click', {
    course: 'another-course', target: 'lesson1',
  });
});
