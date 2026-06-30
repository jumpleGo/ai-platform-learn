'use server';
import { revalidatePath } from 'next/cache';
import { expireSubscription } from '@/lib/db/subscriptions';
import {
  applyGrantToUser, deletePendingGrant, normalizeEmail, savePendingGrant,
} from '@/lib/db/grants';
import { findUserByEmail } from '@/lib/db/users';
import { listAllCourses } from '@/lib/db/admin-courses';
import { requireAdmin } from '@/lib/require-admin';
import { EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/posthog-server';

function assertUid(uid: string) {
  if (!/^[\w-]+$/.test(uid)) throw new Error('invalid uid');
}

// Чекбокс «бессрочно» → null; иначе любое целое число дней ≥ 1; бросает на некорректном значении
function parsePeriodDays(formData: FormData): number | null {
  if (formData.get('unlimited')) return null;
  const days = Number(String(formData.get('periodDays') ?? '').trim());
  if (!Number.isInteger(days) || days < 1) throw new Error('invalid period');
  return days;
}

// Партнёр-slug или null (не менять бренд пользователя)
function parsePartner(value: FormDataEntryValue | null): string | null {
  const slug = String(value ?? '').trim();
  if (!slug) return null;
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('invalid partner');
  return slug;
}

// Набор курсов доступа: чекбокс «все курсы» → null; иначе пересечение выбранных id с реальными курсами.
// Пустой выбор без «все курсы» — ошибка (доступ в никуда).
async function parseCourseIds(formData: FormData): Promise<string[] | null> {
  if (formData.get('allCourses')) return null;
  const selected = formData.getAll('courseIds').map(String);
  const valid = new Set((await listAllCourses()).map((c) => c.id));
  const ids = [...new Set(selected.filter((id) => valid.has(id)))];
  if (ids.length === 0) throw new Error('select courses');
  return ids;
}

export async function grantSubscriptionAction(uid: string, formData: FormData) {
  const session = await requireAdmin();
  assertUid(uid);
  const plan = String(formData.get('plan') ?? '').trim() || 'base';
  const periodDays = parsePeriodDays(formData);
  const partnerId = parsePartner(formData.get('partnerId'));
  const courseIds = await parseCourseIds(formData);
  await applyGrantToUser(uid, { plan, periodDays, partnerId, courseIds, grantedBy: session.uid, source: 'manual' }, Date.now());
  await trackServer(uid, EVENTS.subscriptionActivated, { plan, source: 'manual' });
  revalidatePath('/admin/users');
}

// Выдаёт доступ по email: зарегистрированному — сразу, иначе — отложенным грантом (применится при регистрации)
export async function grantByEmailAction(formData: FormData) {
  const session = await requireAdmin();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!email || !email.includes('@') || email.includes('/')) throw new Error('invalid email');
  const plan = String(formData.get('plan') ?? '').trim() || 'base';
  const periodDays = parsePeriodDays(formData);
  const partnerId = parsePartner(formData.get('partnerId'));
  const courseIds = await parseCourseIds(formData);

  const user = await findUserByEmail(email);
  if (user) {
    await applyGrantToUser(user.uid, { plan, periodDays, partnerId, courseIds, grantedBy: session.uid, source: 'b2b' }, Date.now());
    await trackServer(user.uid, EVENTS.subscriptionActivated, { plan, source: 'b2b' });
  } else {
    await savePendingGrant({ email, plan, periodDays, partnerId, courseIds, grantedBy: session.uid, createdAt: Date.now() });
  }
  revalidatePath('/admin/users');
}

export async function revokeSubscriptionAction(uid: string) {
  await requireAdmin();
  assertUid(uid);
  await expireSubscription(uid);
  revalidatePath('/admin/users');
}

export async function revokePendingGrantAction(email: string) {
  await requireAdmin();
  await deletePendingGrant(email);
  revalidatePath('/admin/users');
}
