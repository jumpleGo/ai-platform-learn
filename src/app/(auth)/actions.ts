'use server';
import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';
import { resolveAttribution } from '@/lib/attribution';

export async function createUserProfile(uid: string, email: string, displayName: string) {
  const jar = await cookies();
  const { partnerId, utm } = resolveAttribution({
    partner: jar.get('partner')?.value ?? null,
    utm: jar.get('utm')?.value ?? null,
  });
  await adminDb.doc(`users/${uid}`).set({
    email, displayName, role: 'user', partnerId, utm, createdAt: Date.now(),
  });
}
