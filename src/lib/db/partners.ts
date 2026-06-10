import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import type { Partner } from '@/lib/types';

export const getPartnerBySlug = unstable_cache(
  async (slug: string): Promise<Partner | null> => {
    // один equality-фильтр (single-field index), активность проверяем в памяти —
    // чтобы запрос не требовал составного индекса Firestore
    const snap = await adminDb.collection('partners').where('slug', '==', slug).limit(5).get();
    const d = snap.docs.find((doc) => doc.data().active === true);
    return d ? { id: d.id, ...(d.data() as Omit<Partner, 'id'>) } : null;
  },
  ['partner-by-slug'],
  { tags: ['partners'], revalidate: 300 },
);

// Без кэша — админка всегда показывает свежие данные

export async function listPartners(): Promise<Partner[]> {
  const snap = await adminDb.collection('partners').orderBy('name').get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Partner, 'id'>) }));
}

export async function savePartner(id: string | null, data: Omit<Partner, 'id'>) {
  if (id) await adminDb.doc(`partners/${id}`).set(data);
  else await adminDb.collection('partners').add(data);
}

export async function deletePartner(id: string) {
  await adminDb.doc(`partners/${id}`).delete();
}

// Атрибуция пишет в profile.partnerId slug из cookie, поэтому считаем юзеров по slug
export async function countUsersByPartner(): Promise<Map<string, number>> {
  const partners = await listPartners();
  const entries = await Promise.all(partners.map(async (p) => {
    const agg = await adminDb.collection('users').where('partnerId', '==', p.slug).count().get();
    return [p.slug, agg.data().count] as const;
  }));
  return new Map(entries);
}

export function invalidatePartners() {
  // в Next 16 revalidateTag требует профиль; 'max' = пометить устаревшим, отдавая старое до фоновой ревалидации (SWR)
  revalidateTag('partners', 'max');
}
