import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';

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

export async function getStudyStreak(uid: string, timestamp: number = Date.now()): Promise<number> {
  // UTC здесь нужен только для арифметики календарных дат; «сегодня» уже определено по МСК.
  const today = Date.parse(`${getMoscowDateString(new Date(timestamp))}T00:00:00Z`);
  const dates = Array.from({ length: 30 }, (_, offset) =>
    new Date(today - offset * 86_400_000).toISOString().slice(0, 10));
  const snap = await adminDb.collection(`users/${uid}/activity`)
    .where(FieldPath.documentId(), '>=', dates[dates.length - 1])
    .where(FieldPath.documentId(), '<=', dates[0])
    .get();
  const activeDates = new Set(snap.docs.map(doc => doc.id));
  let index = activeDates.has(dates[0]) ? 0 : 1;
  let streak = 0;
  while (index < dates.length && activeDates.has(dates[index])) {
    streak++;
    index++;
  }
  return streak;
}

export async function recordDailyActivity(
  uid: string,
  lessonId: string,
  timestamp: number = Date.now(),
) {
  const dateStr = getMoscowDateString(new Date(timestamp));
  const ref = adminDb.doc(`users/${uid}/activity/${dateStr}`);
  await adminDb.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    transaction.set(
      ref,
      {
        ...(snap.data()?.firstAt === undefined ? { firstAt: timestamp } : {}),
        lessons: FieldValue.arrayUnion(lessonId),
      },
      { merge: true },
    );
  });
}
