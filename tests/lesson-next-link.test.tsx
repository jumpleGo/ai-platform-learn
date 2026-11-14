import { createHash } from 'node:crypto';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import posthog from 'posthog-js';
import { beforeEach, expect, it, vi } from 'vitest';
import LessonPage from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import { PaymentModalProvider } from '@/components/payment/payment-modal-context';
import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
vi.mock('@/components/payment/locked-video-player', () => ({ LockedVideoPlayer: () => null }));
vi.mock('posthog-js', () => ({ default: { __loaded: true, capture: vi.fn() } }));

const course: CourseWithLessons = {
  id: 'current-course', slug: 'vibecoding', title: 'Курс', description: '',
  access: 'paid', published: true, isTest: false, coverUrl: null, order: 0,
  testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
  highlightBackground: false, clickCount: 0,
  lessons: [1, 2, 3].map(number => ({
    id: `lesson-${number}`, courseId: 'current-course', number, title: `Урок ${number}`,
    description: '', access: number === 1 ? 'free' : 'paid', published: true,
    videoEmbedUrl: '', durationSec: 60, order: number, views: 0,
    materials: 'LESSON CONTENT END', previewImageUrl: null, marketingVariants: [], relatedVariants: [],
    coverCaption: null, hideHeader: false, hideFooter: false,
    hideBackLink: false, hideLessonsNav: false, marketingHtml: null, relatedHtml: null,
  })),
};

beforeEach(() => {
  vi.mocked(posthog.capture).mockClear();
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([course]);
});

async function renderLesson(number = 1, current = course) {
  const lesson = current.lessons.find(item => item.number === number)!;
  vi.mocked(resolveLesson).mockResolvedValue({
    course: current, lesson, number, publishedAt: '2026-11-14T00:00:00Z',
  });
  const page = await LessonPage({
    params: Promise.resolve({ courseSlug: current.slug, lessonNumber: String(number) }),
    searchParams: Promise.resolve({}),
  });
  const html = renderToStaticMarkup(<PaymentModalProvider>{page}</PaymentModalProvider>);
  return { page, html };
}

function nextLinks(html: string) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .filter(([, , label]) => label.replace(/<[^>]*>/g, '').startsWith('Следующий урок'));
}

function expectNextLink(html: string, slug: string, number: number) {
  const links = nextLinks(html);
  expect(links).toHaveLength(1);
  expect(links[0][1]).toBe(`/courses/${slug}/lessons/${number}`);
  return links[0][0];
}

type ClickLink = { href?: string; onClick?: () => void; children?: ReactNode };
function clickLink(node: ReactNode, href: string): ReactElement<ClickLink> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<ClickLink>(child)) continue;
    if (child.props.href === href && child.props.onClick) return child;
    const subtree = typeof child.type === 'function' && child.type.name === 'NextLessonLink'
      ? (child.type as (props: ClickLink) => ReactNode)(child.props) : child.props.children;
    const found = clickLink(subtree, href);
    if (found) return found;
  }
}

it.each(['vibecoding', 'claude-code-agents', 'ai-cartoons', 'claude-code', 'future-course'])(
  '%s: shows lesson 1 → 2 immediately after the lesson content', async slug => {
    const current = { ...course, slug };
    vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([current]);
    const { html } = await renderLesson(1, current);
    const link = expectNextLink(html, slug, 2);
    expect(link).toContain('Урок 2');
    expect(html.indexOf(link)).toBeGreaterThan(html.indexOf('LESSON CONTENT END'));
    expect(html).not.toContain('data-lessons-nav');
  },
);

it('does not render a next-lesson link on the last published lesson', async () => {
  expect(nextLinks((await renderLesson(3)).html)).toHaveLength(0);
});

it('skips unpublished gaps without changing lesson numbers or crossing courses', async () => {
  const current = { ...course, lessons: [course.lessons[0], course.lessons[2]] };
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([
    { ...course, id: 'other-course', slug: 'other-course' }, current,
  ]);
  expectNextLink((await renderLesson(1, current)).html, 'vibecoding', 3);
  expect(nextLinks((await renderLesson(3, current)).html)).toHaveLength(0);
});

it('sends the next-lesson event and numeric props through PostHog only on click', async () => {
  const { page } = await renderLesson();
  const link = clickLink(page, '/courses/vibecoding/lessons/2');
  expect(link).toBeDefined();
  expect(posthog.capture).not.toHaveBeenCalled();
  link!.props.onClick!();
  expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('lesson_next_click', {
    course_slug: 'vibecoding', from_lesson: 1, to_lesson: 2,
  });
});

// Frozen local SSR of page.tsx:343-396, guest lesson 1, source commit
// 33bff278bce379e6a7d33b59dd266dbcbd8b6536; SHA256: 9c701554a03860f5cf7a38fb9aed73b093be4554eaa1c8d4148a30bdc654b7b2
// Literal markup: this negative control never reads Git, main, or another worktree.
const OLD_LESSON_END = "<div class=\"max-w-2xl rounded-2xl border border-border bg-card/40 p-5 sm:p-6\"><p class=\"mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase\">Материалы урока</p><div><p class=\"mt-3 leading-relaxed text-pretty text-muted-foreground first:mt-0\">LESSON CONTENT END</p></div></div></div>";

it('rejects the frozen old page end with the same next-link assertion', () => {
  expect(createHash('sha256').update(OLD_LESSON_END).digest('hex'))
    .toBe('9c701554a03860f5cf7a38fb9aed73b093be4554eaa1c8d4148a30bdc654b7b2');
  let oldFails = 0;
  try { expectNextLink(OLD_LESSON_END, 'vibecoding', 2); } catch { oldFails++; }
  console.log(`OLD_FAILS=${oldFails}`);
  expect(oldFails).toBe(1);
});
