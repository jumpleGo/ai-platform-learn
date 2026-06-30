'use server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { resolveAttribution } from '@/lib/attribution';
import { claimPendingGrant } from '@/lib/db/grants';
import { EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/posthog-server';

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
  // Доступ, выданный на этот email до регистрации: подписка + (при наличии) партнёрский бренд
  if (decoded.email) await claimPendingGrant(decoded.uid, decoded.email, Date.now());
  await trackServer(decoded.uid, EVENTS.signupCompleted, {
    partnerId,
    utm_source: utm?.utm_source ?? null,
  });
}
