'use server';
import { getSession } from '@/lib/session';
import { markLessonCompleted } from '@/lib/db/progress';
import { recordLessonView } from '@/lib/db/stats';
import { revalidatePath } from 'next/cache';

// Инкремент просмотров при заходе на урок (вызывается с клиента один раз)
export async function recordViewAction(courseId: string, lessonId: string) {
  const session = await getSession();
  if (!session) return;
  await recordLessonView(courseId, lessonId);
}

export async function completeLesson(lessonId: string, path: string) {
  // Валидация входа — защищаемся от мусора в Firestore и в пути ревалидации
  if (!/^[\w-]+$/.test(lessonId)) throw new Error('invalid lessonId');
  if (!/^\/courses\/[\w-]+\/lessons\/[1-9][0-9]{0,3}$/.test(path)) throw new Error('invalid path');
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  await markLessonCompleted(session.uid, lessonId);
  revalidatePath(path);
}
