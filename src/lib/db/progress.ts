import 'server-only';
import { adminDb } from '@/lib/firebase/admin';

export async function getCompletedLessonIds(uid: string): Promise<Set<string>> {
  const snap = await adminDb.collection(`users/${uid}/progress`).where('completed', '==', true).get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function markLessonCompleted(uid: string, lessonId: string) {
  await adminDb.doc(`users/${uid}/progress/${lessonId}`).set({ completed: true, updatedAt: Date.now() });
}
