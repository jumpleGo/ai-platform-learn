import { cache } from 'react';
import type { Course, Lesson } from '@/lib/types';
export type NumberedLesson = Lesson & { number: number };
export type CourseWithLessons = Course & { lessons: NumberedLesson[] };
export type ResolvedLesson = { course: Course; lesson: Lesson; number: number; publishedAt: string };
const publishedNumbers: Record<string, number[]> = {
  'claude-code': [2, 3, 4], 'claude-code-agents': [1, 2],
  'vibecoding': [1, 2], 'ai-cartoons': [1],
};
const courses = Object.entries(publishedNumbers).map(([slug, numbers], index) => ({
  id: 'probe-' + slug, slug, title: slug, description: 'HTTP regression fixture',
  coverUrl: null, order: index, published: true, access: 'paid', isTest: false,
  testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
  highlightBackground: false, clickCount: 0,
  lessons: numbers.map((number) => ({
    id: 'probe-lesson-' + number, courseId: 'probe-' + slug, number,
    title: 'Existing lesson ' + number, description: 'Published lesson fixture',
    videoEmbedUrl: '', durationSec: 60, order: number, access: 'free', published: true,
    materials: '', views: 0, previewImageUrl: null, coverCaption: null,
    hideHeader: false, hideFooter: false, hideBackLink: false, hideLessonsNav: false,
    marketingVariants: [], relatedVariants: [], marketingHtml: null, relatedHtml: null,
  })),
})) as CourseWithLessons[];
export const resolveLesson = cache(async (slug: string, key: string): Promise<ResolvedLesson | null> => {
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const course = courses.find((item) => item.slug === slug || item.id === slug);
  const lesson = course?.lessons.find((item) => String(item.number) === key || item.id === key);
  return course && lesson ? { course, lesson, number: lesson.number, publishedAt: '2026-11-11T00:00:00.000Z' } : null;
});
export async function getPublishedCoursesWithLessons() { return courses; }
export async function getTestCourse(_key: string): Promise<Course | null> { return null; }
export async function getLesson(_courseId: string, _lessonId: string): Promise<{ course: Course; lesson: Lesson } | null> {
  throw new Error('Unexpected probe lookup');
}
export function invalidateCatalog() { throw new Error('Read-only HTTP probe'); }
export async function getRegisteredUsersCount() { return 0; }
export async function recordLessonView(_courseId: string, _lessonId: string) { throw new Error('Read-only HTTP probe'); }
export async function incrementTestCourseClick(_courseId: string) { throw new Error('Read-only HTTP probe'); }
