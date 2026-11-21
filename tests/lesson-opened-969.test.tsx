import { Children, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LessonPage from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import { FreeLessonAnalytics } from '@/components/free-lesson-analytics';
import { TrackOnMount } from '@/components/track-on-mount';
import { getPublishedCoursesWithLessons, resolveLesson } from '@/lib/db/courses';
import posthog from '@/lib/analytics/posthog';
import type { Course, Lesson } from '@/lib/types';

const sdk = vi.hoisted(() => ({ init: vi.fn(), register_once: vi.fn(), capture: vi.fn() }));
const mounted = vi.hoisted(() => ({ effects: [] as (() => void)[] }));

vi.mock('posthog-js', () => ({ default: sdk }));
// Await the server page, then run the real client effects after rendering its opening tracker.
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void) => { mounted.effects.push(effect); },
}));
vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({
  getCompletedLessonIds: vi.fn(), getStudyStreak: vi.fn(),
  markLessonCompleted: vi.fn(), recordDailyActivity: vi.fn(),
}));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));

beforeEach(async () => {
  vi.clearAllMocks();
  mounted.effects.length = 0;
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'lesson-opened-test-key');
  vi.stubGlobal('window', { location: new URL('https://gelato.education/courses/vibecoding/lessons/1'), innerWidth: 1280 });
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0', webdriver: false });
  await posthog.init('lesson-opened-test-key', {}, {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function openLesson(courseSlug: string, number: number, access: Lesson['access']) {
  const course: Course = {
    id: `course-doc-${courseSlug}`, slug: courseSlug, title: 'Курс', description: '',
    access: 'paid', published: true, isTest: false, coverUrl: null, order: 0,
    testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
    highlightBackground: false, clickCount: 0,
  };
  const lesson: Lesson = {
    id: `lesson-doc-${number}`, courseId: course.id, title: `Урок ${number}`,
    description: '', access, published: true, videoEmbedUrl: '', durationSec: 60,
    order: number * 10, views: 0, materials: '', previewImageUrl: null,
    marketingVariants: [], relatedVariants: [], coverCaption: null,
    hideHeader: false, hideFooter: false, hideBackLink: false, hideLessonsNav: false,
    marketingHtml: null, relatedHtml: null,
  };
  vi.mocked(resolveLesson).mockResolvedValue({ course, lesson, number, publishedAt: '2026-11-21T00:00:00Z' });
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([{ ...course, lessons: [{ ...lesson, number }] }]);
  const page = await LessonPage({
    params: Promise.resolve({ courseSlug, lessonNumber: String(number) }),
    searchParams: Promise.resolve({}),
  });
  expect(resolveLesson).toHaveBeenCalledExactlyOnceWith(courseSlug, String(number));
  expect(sdk.capture).not.toHaveBeenCalled();
  const opening = Children.toArray(page.props.children).filter(child =>
    isValidElement<{ event?: string }>(child) && (
      child.type === FreeLessonAnalytics || (child.type === TrackOnMount && child.props.event === 'lesson_opened')
    ),
  );
  expect(opening).toHaveLength(1);
  renderToStaticMarkup(opening);
  for (const effect of mounted.effects.splice(0)) effect();
  return { course, lesson };
}

it.each([
  ['vibecoding', 1, 'free', false],
  ['vibecoding', 2, 'paid', true],
  ['claude-code-agents', 1, 'free', false],
  ['claude-code-agents', 2, 'paid', true],
  ['another-course', 1, 'paid', true],
  ['another-course', 2, 'free', false],
] as const)(
  'emits lesson_opened once with numeric URL lessonNumber for %s lesson %s (%s)',
  async (courseSlug, number, access, locked) => {
    const { course, lesson } = await openLesson(courseSlug, number, access);
    expect(sdk.capture).toHaveBeenCalledExactlyOnceWith('lesson_opened', {
      courseId: course.id, lessonId: lesson.id, locked, lessonNumber: number,
    });
    expect(sdk.capture.mock.calls[0][1].lessonNumber).toBeTypeOf('number');
  },
);

it('preserves the single lesson_view and its string properties on the free claude-code path', async () => {
  const { course, lesson } = await openLesson('claude-code', 1, 'free');
  expect(sdk.capture).toHaveBeenCalledExactlyOnceWith('lesson_view', {
    courseId: course.id, lessonDocumentId: lesson.id, lesson_id: '01',
    source: 'direct', campaign: 'gelato_dev', device: 'desktop',
  });
});
