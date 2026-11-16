import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import LessonPage from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import { CompleteLessonButton } from '@/components/complete-lesson-button';
import { PaymentModalProvider } from '@/components/payment/payment-modal-context';
import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
import { getCompletedLessonIds, getStudyStreak } from '@/lib/db/progress';
import { getSession } from '@/lib/session';

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: async () => null }));
vi.mock('@/lib/db/progress', () => ({
  getCompletedLessonIds: vi.fn(), getStudyStreak: vi.fn(),
  markLessonCompleted: vi.fn(), recordDailyActivity: vi.fn(),
}));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
vi.mock('@/lib/analytics/posthog', () => ({ default: { __loaded: true, capture: vi.fn() } }));

// Free access in a course without a marketing funnel keeps the existing completion control visible.
const course: CourseWithLessons = {
  id: 'course-test', slug: 'course-test', title: 'Курс', description: '',
  access: 'paid', published: true, isTest: false, coverUrl: null, order: 0,
  testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
  highlightBackground: false, clickCount: 0,
  lessons: [1, 3].map(number => ({
    id: `lesson-${number}`, courseId: 'course-test', number, title: `Урок ${number}`,
    description: '', access: 'free', published: true, videoEmbedUrl: '', durationSec: 60,
    order: number, views: 0, materials: '', previewImageUrl: null,
    marketingVariants: [], relatedVariants: [], coverCaption: null,
    hideHeader: false, hideFooter: false, hideBackLink: false, hideLessonsNav: false,
    marketingHtml: null, relatedHtml: null,
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue({
    uid: 'user-626', sub: 'user-626', email: 'user@example.com', aud: 'demo-study',
    auth_time: 0, exp: 0, iat: 0, iss: 'https://securetoken.google.com/demo-study',
    firebase: { identities: {}, sign_in_provider: 'password' },
  });
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([course]);
  vi.mocked(getCompletedLessonIds).mockResolvedValue(new Set(['lesson-1', 'lesson-3']));
  vi.mocked(getStudyStreak).mockResolvedValue(3);
});

async function renderLesson(number = 1) {
  vi.mocked(resolveLesson).mockResolvedValue({
    course, lesson: course.lessons.find(item => item.number === number)!,
    number, publishedAt: '2026-11-16T00:00:00Z',
  });
  const page = await LessonPage({
    params: Promise.resolve({ courseSlug: course.slug, lessonNumber: String(number) }),
    searchParams: Promise.resolve({}),
  });
  return { page, html: renderToStaticMarkup(<PaymentModalProvider>{page}</PaymentModalProvider>) };
}

function completion(node: ReactNode): ReactElement<Parameters<typeof CompleteLessonButton>[0]> | undefined {
  let found: ReturnType<typeof completion>;
  // forEach preserves the original element key; toArray prefixes keys during flattening.
  Children.forEach(node, child => {
    if (found || !isValidElement<{ children?: ReactNode }>(child)) return;
    found = child.type === CompleteLessonButton
      ? child as ReturnType<typeof completion>
      : completion(child.props.children);
  });
  return found;
}

it('reads the signed-in learner’s streak and restores it after a fresh page request', async () => {
  const { html, page } = await renderLesson();
  expect(getStudyStreak).toHaveBeenCalledExactlyOnceWith('user-626');
  expect(html).toContain('Вы учитесь 3 дня подряд');
  expect(html).not.toContain('Завтра продолжите со следующего урока');
  expect(completion(page)?.props.hasNextLesson).toBe(true);
  expect(completion(page)?.key).toBe('lesson-1');
});

it('hides the streak for guests and never reads a guest’s activity', async () => {
  vi.mocked(getSession).mockResolvedValue(null);
  const { html, page } = await renderLesson();
  expect(getStudyStreak).not.toHaveBeenCalled();
  expect(getCompletedLessonIds).not.toHaveBeenCalled();
  expect(completion(page)).toBeUndefined();
  expect(html).not.toContain('Вы учитесь');
  expect(html).not.toContain('Завтра продолжите со следующего урока');
});

it('passes the absence of a next published lesson on the last lesson', async () => {
  const { page, html } = await renderLesson(3);
  expect(completion(page)?.props.hasNextLesson).toBe(false);
  expect(completion(page)?.key).toBe('lesson-3');
  expect(html).not.toContain('Завтра продолжите со следующего урока');
});

it('keeps the lesson available without a fabricated count if activity cannot be read', async () => {
  vi.mocked(getStudyStreak).mockRejectedValueOnce(new Error('Activity unavailable'));
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { html } = await renderLesson();
    expect(html).toContain('Пройдено');
    expect(html).not.toContain('Вы учитесь');
    expect(error).toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});
