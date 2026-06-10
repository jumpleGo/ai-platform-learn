import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import type { Course, Lesson } from '@/lib/types';

export type CourseWithLessons = Course & { lessons: Lesson[] };

export const getPublishedCoursesWithLessons = unstable_cache(
  async (): Promise<CourseWithLessons[]> => {
    const snap = await adminDb.collection('courses')
      .where('published', '==', true).orderBy('order').get();
    return Promise.all(snap.docs.map(async (d) => {
      const lessons = await d.ref.collection('lessons').orderBy('order').get();
      return {
        id: d.id, ...(d.data() as Omit<Course, 'id'>),
        lessons: lessons.docs.map((l) => ({ id: l.id, courseId: d.id, ...(l.data() as Omit<Lesson, 'id' | 'courseId'>) })),
      };
    }));
  },
  ['catalog'],
  { tags: ['catalog'], revalidate: 300 },
);

export async function getLesson(courseId: string, lessonId: string): Promise<{ course: Course; lesson: Lesson } | null> {
  const courseSnap = await adminDb.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) return null;
  const lessonSnap = await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).get();
  if (!lessonSnap.exists) return null;
  return {
    course: { id: courseSnap.id, ...(courseSnap.data() as Omit<Course, 'id'>) },
    lesson: { id: lessonSnap.id, courseId, ...(lessonSnap.data() as Omit<Lesson, 'id' | 'courseId'>) },
  };
}

export function invalidateCatalog() {
  // в Next 16 revalidateTag требует профиль; 'max' = немедленно пометить устаревшим
  revalidateTag('catalog', 'max');
}
