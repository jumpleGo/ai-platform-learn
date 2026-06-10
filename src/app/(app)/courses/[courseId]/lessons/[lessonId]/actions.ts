'use server';
import { getSession } from '@/lib/session';
import { markLessonCompleted } from '@/lib/db/progress';
import { revalidatePath } from 'next/cache';

export async function completeLesson(courseId: string, lessonId: string) {
  // Валидация id — защищаемся от мусора в пути ревалидации и Firestore
  if (!/^[\w-]+$/.test(courseId)) throw new Error('invalid courseId');
  if (!/^[\w-]+$/.test(lessonId)) throw new Error('invalid lessonId');
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  await markLessonCompleted(session.uid, lessonId);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
}
