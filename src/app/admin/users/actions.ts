'use server';
import { revalidatePath } from 'next/cache';
import { expireSubscription, grantSubscription } from '@/lib/db/subscriptions';
import { requireAdmin } from '@/lib/require-admin';

function assertUid(uid: string) {
  if (!/^[\w-]+$/.test(uid)) throw new Error('invalid uid');
}

const PERIODS: Record<string, number> = { '30': 30, '90': 90, '365': 365 };

export async function grantSubscriptionAction(uid: string, formData: FormData) {
  const session = await requireAdmin();
  assertUid(uid);
  const plan = String(formData.get('plan') ?? '').trim() || 'base';
  const period = String(formData.get('periodDays') ?? '');
  if (period !== 'unlimited' && !PERIODS[period]) throw new Error('invalid period');
  const expiresAt = period === 'unlimited' ? null : Date.now() + PERIODS[period] * 86_400_000;
  await grantSubscription(uid, {
    status: 'active',
    plan,
    source: 'manual',
    startsAt: Date.now(),
    expiresAt,
    grantedBy: session.uid,
  });
  revalidatePath('/admin/users');
}

export async function revokeSubscriptionAction(uid: string) {
  await requireAdmin();
  assertUid(uid);
  await expireSubscription(uid);
  revalidatePath('/admin/users');
}
