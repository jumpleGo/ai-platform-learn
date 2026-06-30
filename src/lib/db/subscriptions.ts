import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import type { Subscription } from '@/lib/types';

export async function getSubscription(uid: string): Promise<Subscription | null> {
  const snap = await adminDb.doc(`subscriptions/${uid}`).get();
  return snap.exists ? (snap.data() as Subscription) : null;
}

export async function grantSubscription(uid: string, sub: Subscription) {
  await adminDb.doc(`subscriptions/${uid}`).set(sub);
}

export async function expireSubscription(uid: string) {
  await adminDb.doc(`subscriptions/${uid}`).set({ status: 'expired' }, { merge: true });
}

// Помечает истёкшие подписки expired. Запрос — только по expiresAt (single-field index,
// бессрочные с expiresAt === null под неравенство не попадают), статус фильтруем в памяти.
export async function expireOverdueSubscriptions(now: number): Promise<number> {
  const snap = await adminDb.collection('subscriptions').where('expiresAt', '<=', now).get();
  const batch = adminDb.batch();
  let count = 0;
  for (const d of snap.docs) {
    if ((d.data() as Subscription).status === 'active') {
      batch.update(d.ref, { status: 'expired' });
      count++;
    }
  }
  if (count) await batch.commit();
  return count;
}
