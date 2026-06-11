import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import type { Subscription, UserDoc } from '@/lib/types';

export type AdminUserRow = UserDoc & { uid: string; subscription: Subscription | null };

export async function listUsers(search?: string): Promise<AdminUserRow[]> {
  // поиск по точному email (Firestore не умеет contains); без поиска — последние 50 по createdAt
  let query = adminDb.collection('users').orderBy('createdAt', 'desc').limit(50);
  if (search) query = adminDb.collection('users').where('email', '==', search).limit(50) as typeof query;
  const snap = await query.get();
  if (snap.empty) return [];
  // getAll — один batch-RPC вместо 50 параллельных get
  const subs = await adminDb.getAll(...snap.docs.map((d) => adminDb.doc(`subscriptions/${d.id}`)));
  return snap.docs.map((d, i) => ({
    uid: d.id,
    ...(d.data() as UserDoc),
    subscription: subs[i].exists ? (subs[i].data() as Subscription) : null,
  }));
}
