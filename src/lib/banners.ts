// A/B-тест маркетинговых блоков урока: выбор варианта и ключи счётчиков.
// Модуль чистый (без 'server-only') — используется и на странице урока, и в админке.
import type { Lesson, LessonBanner } from '@/lib/types';

// Слоты маркетинговых блоков урока: баннер в зоне материалов и блоки в самом низу
export const BANNER_SLOTS = ['materials', 'related'] as const;
export type BannerSlot = (typeof BANNER_SLOTS)[number];

export const SLOT_TITLES: Record<BannerSlot, string> = {
  materials: 'Баннер под уроком',
  related: 'Сопутствующие блоки',
};

// Набор вариантов фиксирован — так форма в админке остаётся без клиентского состояния
export const VARIANT_IDS = ['a', 'b', 'c', 'd'] as const;
export type VariantId = (typeof VARIANT_IDS)[number];

// Вес по умолчанию: поле оставили пустым — вариант делит показы наравне с остальными
export const DEFAULT_WEIGHT = 100;

export function variantLabel(id: string): string {
  return id.toUpperCase();
}

export function isBannerSlot(value: unknown): value is BannerSlot {
  return typeof value === 'string' && (BANNER_SLOTS as readonly string[]).includes(value);
}

export function isVariantId(value: unknown): value is VariantId {
  return typeof value === 'string' && (VARIANT_IDS as readonly string[]).includes(value);
}

// Варианты слота у урока. У уроков, которые не пересохраняли после появления
// A/B-тестов, вариантов нет — тогда отдаём старое одиночное поле как вариант A.
export function slotVariants(lesson: Lesson, slot: BannerSlot): LessonBanner[] {
  const stored = slot === 'materials' ? lesson.marketingVariants : lesson.relatedVariants;
  if (stored?.length) return stored.filter((v) => v.html.trim() !== '');
  const legacy = slot === 'materials' ? lesson.marketingHtml : lesson.relatedHtml;
  return legacy ? [{ id: 'a', name: 'Вариант A', html: legacy, weight: DEFAULT_WEIGHT }] : [];
}

// FNV-1a: быстрый детерминированный хеш, одинаковый на сервере и клиенте
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Вариант для показа: доля показов пропорциональна весу, выбор детерминированный —
// один посетитель на одном уроке всегда видит один и тот же баннер.
// Все веса нулевые (или вариантов нет) — блок не показывается вовсе.
export function pickVariant(variants: LessonBanner[], seed: string): LessonBanner | null {
  const active = variants.filter((v) => v.html.trim() !== '' && v.weight > 0);
  const total = active.reduce((sum, v) => sum + v.weight, 0);
  if (total === 0) return null;
  let point = hashSeed(seed) % total;
  for (const variant of active) {
    point -= variant.weight;
    if (point < 0) return variant;
  }
  return active[active.length - 1];
}

// Сид выбора: посетитель + урок + слот. Слот в сиде — чтобы варианты двух блоков
// не оказались жёстко склеены (иначе всегда A+A либо B+B).
export function variantSeed(visitorId: string, lessonId: string, slot: BannerSlot): string {
  return `${visitorId}:${lessonId}:${slot}`;
}

// Ключ ссылки в счётчиках: в ключах Firestore-мапы нельзя точки и слеши, поэтому хеш
export function linkKey(href: string): string {
  return `l${hashSeed(href).toString(36)}`;
}
