import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import type { Course, Lesson } from '@/lib/types';

// Без кэша — админка всегда показывает свежие данные

export async function listAllCourses(): Promise<Array<Course & { lessonCount: number }>> {
  const snap = await adminDb.collection('courses').orderBy('order').get();
  return Promise.all(snap.docs.map(async (d) => {
    const count = await d.ref.collection('lessons').count().get();
    return { id: d.id, ...(d.data() as Omit<Course, 'id'>), lessonCount: count.data().count };
  }));
}

export async function getCourseWithLessons(courseId: string): Promise<(Course & { lessons: Lesson[] }) | null> {
  const doc = await adminDb.doc(`courses/${courseId}`).get();
  if (!doc.exists) return null;
  const lessons = await doc.ref.collection('lessons').orderBy('order').get();
  return {
    id: doc.id, ...(doc.data() as Omit<Course, 'id'>),
    lessons: lessons.docs.map((l) => ({ id: l.id, courseId: doc.id, ...(l.data() as Omit<Lesson, 'id' | 'courseId'>) })),
  };
}
