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
