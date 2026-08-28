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
// 1 — сцена становится главной, 0 — остаётся только привычная витрина.
export const SCENE_SHARE = 0.5;

// Делим показы детерминированно: один посетитель всегда видит одну и ту же
// главную, иначе замер конверсии смешает варианты внутри одного визита.
// Берём хеш целиком (а не остаток от деления): у FNV-1a младший бит почти
// не перемешан, и деление по нему даёт перекос.
export function pickHomeVariant(visitorId: string): HomeVariant {
  return hashSeed(`home:${visitorId}`) / 0x1_0000_0000 < SCENE_SHARE ? 'scene' : 'classic';
}
