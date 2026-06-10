'use server';
import { getSession } from '@/lib/session';
import { markLessonCompleted } from '@/lib/db/progress';
import { revalidatePath } from 'next/cache';

export async function completeLesson(lessonId: string) {
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  await markLessonCompleted(session.uid, lessonId);
  revalidatePath('/', 'layout');
}
