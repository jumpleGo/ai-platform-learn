import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import type { Subscription } from '@/lib/types';

export async function getSubscription(uid: string): Promise<Subscription | null> {
  const snap = await adminDb.doc(`subscriptions/${uid}`).get();
  return snap.exists ? (snap.data() as Subscription) : null;
}
