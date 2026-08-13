import 'server-only';
import { unstable_cache } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

// Реальный счётчик просмотров урока — растёт при открытии
export async function recordLessonView(courseId: string, lessonId: string) {
  if (!/^[\w-]+$/.test(courseId) || !/^[\w-]+$/.test(lessonId)) return;
  await adminDb
    .doc(`courses/${courseId}/lessons/${lessonId}`)
    .set({ views: FieldValue.increment(1) }, { merge: true });
}

// Счётчик кликов по тестовому (маркетинговому) курсу — считаем спрос
export async function incrementTestCourseClick(courseId: string) {
  if (!/^[\w-]+$/.test(courseId)) return;
  await adminDb
    .doc(`courses/${courseId}`)
    .set({ clickCount: FieldValue.increment(1) }, { merge: true });
}

// Якорь для индикатора присутствия: реальное число зарегистрированных.
// Кэш 5 минут — не бьём в Firestore на каждый рендер главной
export const getRegisteredUsersCount = unstable_cache(
  async (): Promise<number> => {
    const agg = await adminDb.collection('users').count().get();
    return agg.data().count;
  },
  ['users-count'],
  { tags: ['users-count'], revalidate: 300 },
);
