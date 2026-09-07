// A/B-тест главной: привычная витрина против нарисованной сцены-джелатерии.
// Обе живут по адресу '/', сцену прокси подставляет рерайтом — отдельной
// страницы для посетителя нет, поэтому и ссылка на сайте всего одна.
import { hashSeed } from './banners';

export const HOME_VARIANTS = ['classic', 'scene'] as const;
export type HomeVariant = (typeof HOME_VARIANTS)[number];

// Внутренний путь варианта «сцена»: наружу не показывается, прямые заходы
// прокси уводит на главную с принудительным вариантом
export const SCENE_PATH = '/gelateria';

// Cookie и query-параметр для ручного выбора варианта (QA, ссылки на сцену)
export const HOME_VARIANT_PARAM = 'home';

export function isHomeVariant(value: unknown): value is HomeVariant {
  return typeof value === 'string' && (HOME_VARIANTS as readonly string[]).includes(value);
}

// Доля посетителей, которым достаётся сцена. Здесь же тест и сворачивается:
// 1 — сцена становится главной для всех гостей, 0 — остаётся только привычная витрина.
export const SCENE_SHARE = 1.0;

// Делим показы детерминированно: при SCENE_SHARE = 1.0 все гости видят сцену-джелатерию
export function pickHomeVariant(visitorId: string): HomeVariant {
  if (SCENE_SHARE >= 1.0) return 'scene';
  if (SCENE_SHARE <= 0.0) return 'classic';
  return hashSeed(`home:${visitorId}`) / 0x1_0000_0000 < SCENE_SHARE ? 'scene' : 'classic';
}
