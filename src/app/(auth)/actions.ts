'use server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { resolveAttribution } from '@/lib/attribution';

// Создаёт профиль пользователя по проверенному idToken; идемпотентна —
// если профиль уже существует, ничего не делает
export async function ensureUserProfile(idToken: string, displayName?: string) {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const ref = adminDb.doc(`users/${decoded.uid}`);
  const snap = await ref.get();
  if (snap.exists) return;

  const jar = await cookies();
  const { partnerId, utm } = resolveAttribution({
    partner: jar.get('partner')?.value ?? null,
    utm: jar.get('utm')?.value ?? null,
  });
  await ref.set({
    email: decoded.email ?? '',
    displayName: displayName ?? decoded.name ?? '',
    role: 'user',
    partnerId,
    utm,
    createdAt: Date.now(),
  });
}
