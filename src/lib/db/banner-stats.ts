import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { linkKey, type BannerSlot } from '@/lib/banners';

// Счётчики A/B-теста маркетинговых блоков урока. Документ на пару «слот + вариант»:
// courses/{courseId}/lessons/{lessonId}/bannerStats/{slot}_{variantId}
export interface BannerLinkStat {
  href: string;
  label: string;
  clicks: number;
}

export interface BannerStat {
  slot: BannerSlot;
  variantId: string;
  shown: number;
  clicks: number;
  // Клики по конкретным ссылкам внутри баннера, ключ — хеш href
  links: Record<string, BannerLinkStat>;
}

const ID = /^[\w-]{1,64}$/;

function statDoc(courseId: string, lessonId: string, slot: BannerSlot, variantId: string) {
  return adminDb.doc(`courses/${courseId}/lessons/${lessonId}/bannerStats/${slot}_${variantId}`);
}

export async function recordBannerShown(
  courseId: string, lessonId: string, slot: BannerSlot, variantId: string,
) {
  if (!ID.test(courseId) || !ID.test(lessonId)) return;
  await statDoc(courseId, lessonId, slot, variantId).set(
    { slot, variantId, shown: FieldValue.increment(1) },
    { merge: true },
  );
}

export async function recordBannerClick(
  courseId: string, lessonId: string, slot: BannerSlot, variantId: string,
  href: string, label: string,
) {
  if (!ID.test(courseId) || !ID.test(lessonId)) return;
  await statDoc(courseId, lessonId, slot, variantId).set(
    {
      slot,
      variantId,
      clicks: FieldValue.increment(1),
      links: {
        [linkKey(href)]: { href, label, clicks: FieldValue.increment(1) },
      },
    },
    { merge: true },
  );
}

export async function getLessonBannerStats(courseId: string, lessonId: string): Promise<BannerStat[]> {
  const snap = await adminDb
    .collection(`courses/${courseId}/lessons/${lessonId}/bannerStats`)
    .get();
  return snap.docs.map((d) => {
    const data = d.data() as Partial<BannerStat>;
    return {
      slot: data.slot as BannerSlot,
      variantId: data.variantId ?? '',
      shown: data.shown ?? 0,
      clicks: data.clicks ?? 0,
      links: data.links ?? {},
    };
  });
}

// Обнуление после замены баннеров — иначе старые показы смешиваются с новыми
export async function resetLessonBannerStats(courseId: string, lessonId: string) {
  const path = `courses/${courseId}/lessons/${lessonId}/bannerStats`;
  const snap = await adminDb.collection(path).get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
