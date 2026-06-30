import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { grantSubscription } from '@/lib/db/subscriptions';
import type { PendingGrant } from '@/lib/types';

const DAY = 86_400_000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// expiresAt считаем от момента активации; periodDays === null — бессрочно
function expiresFrom(periodDays: number | null, now: number): number | null {
  return periodDays === null ? null : now + periodDays * DAY;
}

export type GrantParams = {
  plan: string;
  periodDays: number | null;
  partnerId: string | null;
  // Курсы доступа; null — все курсы
  courseIds: string[] | null;
  grantedBy: string;
  source: 'manual' | 'b2b';
};

// Выдаёт подписку уже зарегистрированному пользователю и, если указан партнёр, переносит его на партнёрский бренд
export async function applyGrantToUser(uid: string, params: GrantParams, now: number) {
  await grantSubscription(uid, {
    status: 'active',
    plan: params.plan,
    source: params.source,
    startsAt: now,
    expiresAt: expiresFrom(params.periodDays, now),
    grantedBy: params.grantedBy,
    courseIds: params.courseIds,
  });
  if (params.partnerId) {
    await adminDb.doc(`users/${uid}`).update({ partnerId: params.partnerId });
  }
}

export async function listPendingGrants(): Promise<PendingGrant[]> {
  const snap = await adminDb.collection('grants').orderBy('createdAt', 'desc').limit(50).get();
  return snap.docs.map((d) => d.data() as PendingGrant);
}

export async function savePendingGrant(grant: PendingGrant) {
  await adminDb.doc(`grants/${grant.email}`).set(grant);
}

export async function deletePendingGrant(email: string) {
  await adminDb.doc(`grants/${normalizeEmail(email)}`).delete();
}

// Применяет отложенный грант при регистрации: подписка + партнёр, затем удаляет грант
export async function claimPendingGrant(uid: string, email: string, now: number): Promise<PendingGrant | null> {
  const key = normalizeEmail(email);
  if (!key) return null;
  const ref = adminDb.doc(`grants/${key}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const grant = snap.data() as PendingGrant;
  await applyGrantToUser(uid, {
    plan: grant.plan,
    periodDays: grant.periodDays,
    partnerId: grant.partnerId,
    courseIds: grant.courseIds ?? null,
    grantedBy: grant.grantedBy,
    source: 'b2b',
  }, now);
  await ref.delete();
  return grant;
}
