import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
import { generateMetadata } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import LessonLayout from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout';
import sitemap from '@/app/sitemap';

vi.mock('@/lib/db/courses', () => ({
  getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn(),
}));
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
vi.mock('@/components/payment/locked-video-player', () => ({ LockedVideoPlayer: () => null }));

// Published catalog boundary: gaps retain their URL numbers; a free lesson can
// belong to a paid course. A waitlist course must not expose lessons in sitemap.
const catalog = [
  { slug: 'claude-code', lessons: [{ number: 2, access: 'free' }, { number: 5, access: 'paid' }] },
  { slug: 'claude-code-agents', lessons: [{ number: 1, access: 'free' }, { number: 2, access: 'paid' }] },
  { slug: 'vibecoding', lessons: [{ number: 1, access: 'free' }, { number: 3, access: 'free' }] },
  { slug: 'ai-cartoons', isTest: true, lessons: [{ number: 1, access: 'free' }] },
  { slug: 'another-course', lessons: [{ number: 7, access: 'paid' }] },
].map((course) => ({
  ...course, id: `id-${course.slug}`, title: course.slug, description: 'Course description',
  published: true, access: 'paid', isTest: course.isTest ?? false,
  lessons: course.lessons.map((lesson) => ({
    ...lesson, id: `lesson-${lesson.number}`, courseId: `id-${course.slug}`,
    title: `Lesson ${lesson.number}`, description: 'Lesson description', published: true,
  })),
})) as CourseWithLessons[];

const publishedLessons = catalog.flatMap((course) => course.lessons.map((lesson) => ({ course, lesson })));

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue(catalog);
  vi.mocked(resolveLesson).mockImplementation(async (slug, number) => {
    const found = publishedLessons.find(({ course, lesson }) =>
      [course.slug, course.id].includes(slug) && [String(lesson.number), lesson.id].includes(number));
    return found ? { ...found, number: found.lesson.number, publishedAt: '2026-11-12T00:00:00Z' } : null;
  });
});

function metadataFor(path: string) {
  const url = new URL(path, 'https://gelato.education');
  const [, , courseSlug, , lessonNumber] = url.pathname.split('/');
  const props = {
    params: Promise.resolve({ courseSlug, lessonNumber }),
    searchParams: Promise.resolve(Object.fromEntries(url.searchParams)),
  };
  return generateMetadata(props);
}

describe('published lesson canonical', () => {
  it.each(publishedLessons)('$course.slug/$lesson.number: self-canonical with and without campaign query', async ({ course, lesson }) => {
    const path = `/courses/${course.slug}/lessons/${lesson.number}`;
    for (const query of ['', '?from=course_landing']) {
      const metadata = await metadataFor(path + query);
      expect(metadata.alternates?.canonical).toBe(`https://gelato.education${path}`);
    }
  });

  it('uses the resolved slug and number for a legacy document URL', async () => {
    const metadata = await metadataFor('/courses/id-claude-code-agents/lessons/lesson-1?from=course_landing');
    expect(metadata.alternates?.canonical).toBe('https://gelato.education/courses/claude-code-agents/lessons/1');
  });

  it.each([
    ['claude-code', '1'], ['claude-code-agents', '999'], ['missing', '1'],
  ])('%s/%s: missing or unpublished lesson remains a 404', async (courseSlug, lessonNumber) => {
    const params = Promise.resolve({ courseSlug, lessonNumber });
    await expect(LessonLayout({ params, children: 'lesson' })).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404'),
    });
    expect((await generateMetadata({ params })).alternates).toBeUndefined();
  });
});

describe('public lesson sitemap', () => {
  it('includes free lessons from every active course, preserving published numbers', async () => {
    const urls = (await sitemap()).map((entry) => entry.url).filter((url) => url.includes('/lessons/'));
    expect(urls.sort()).toEqual([
      'https://gelato.education/courses/claude-code/lessons/2',
      'https://gelato.education/courses/claude-code-agents/lessons/1',
      'https://gelato.education/courses/vibecoding/lessons/1',
      'https://gelato.education/courses/vibecoding/lessons/3',
    ].sort());
    for (const url of urls) {
      expect((await metadataFor(url)).alternates?.canonical).toBe(url);
    }
  });

  it('excludes paid lessons and waitlist lessons even when marked free', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).not.toContain('https://gelato.education/courses/claude-code/lessons/5');
    expect(urls).not.toContain('https://gelato.education/courses/claude-code-agents/lessons/2');
    expect(urls).not.toContain('https://gelato.education/courses/ai-cartoons/lessons/1');
  });
});
