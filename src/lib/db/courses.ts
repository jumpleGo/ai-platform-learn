import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import type { Course, Lesson } from '@/lib/types';

export type CourseWithLessons = Course & { lessons: Lesson[] };

export const getPublishedCoursesWithLessons = unstable_cache(
  async (): Promise<CourseWithLessons[]> => {
    // только equality-фильтр (single-field index), сортировка по order — в памяти:
    // так запрос не требует составного индекса Firestore
    const snap = await adminDb.collection('courses').where('published', '==', true).get();
    const courses = await Promise.all(snap.docs.map(async (d) => {
      const lessons = await d.ref.collection('lessons').orderBy('order').get();
      return {
        id: d.id, ...(d.data() as Omit<Course, 'id'>),
        lessons: lessons.docs.map((l) => ({ id: l.id, courseId: d.id, ...(l.data() as Omit<Lesson, 'id' | 'courseId'>) })),
      };
    }));
    return courses.sort((a, b) => a.order - b.order);
  },
  ['catalog'],
  { tags: ['catalog'], revalidate: 300 },
);

export async function getLesson(courseId: string, lessonId: string): Promise<{ course: Course; lesson: Lesson } | null> {
  const courseSnap = await adminDb.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) return null;
  // черновик не доступен по прямому URL — страница отдаст notFound
  if (!(courseSnap.data() as { published?: boolean }).published) return null;
  const lessonSnap = await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).get();
  if (!lessonSnap.exists) return null;
  return {
    course: { id: courseSnap.id, ...(courseSnap.data() as Omit<Course, 'id'>) },
    lesson: { id: lessonSnap.id, courseId, ...(lessonSnap.data() as Omit<Lesson, 'id' | 'courseId'>) },
  };
}

export function invalidateCatalog() {
  // в Next 16 revalidateTag требует профиль; 'max' = пометить устаревшим, отдавая старое до фоновой ревалидации (SWR)
  revalidateTag('catalog', 'max');
}
