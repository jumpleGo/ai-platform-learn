import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function getCompletedLessonIds(uid: string): Promise<Set<string>> {
  const snap = await adminDb.collection(`users/${uid}/progress`).where('completed', '==', true).get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function markLessonCompleted(uid: string, lessonId: string) {
  await adminDb.doc(`users/${uid}/progress/${lessonId}`).set({ completed: true, updatedAt: Date.now() });
}

export function getMoscowDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function recordDailyActivity(
  uid: string,
  lessonId: string,
  timestamp: number = Date.now(),
) {
  const dateStr = getMoscowDateString(new Date(timestamp));
  const ref = adminDb.doc(`users/${uid}/activity/${dateStr}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.firstAt === undefined) {
    await ref.set(
      {
        firstAt: timestamp,
        lessons: FieldValue.arrayUnion(lessonId),
      },
      { merge: true },
    );
  } else {
    await ref.set(
      {
        lessons: FieldValue.arrayUnion(lessonId),
      },
      { merge: true },
    );
  }
}

