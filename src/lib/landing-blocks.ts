// Состав блоков лендинга курса под A/B-тест длины.
//
// Замеры 2026-09-12 (390×844, прод): страница вайбкода — 16 949 px, это ~22 экрана,
// медиана долистывания 42%, до тарифов (#pricing) не дошёл никто. Отсюда правило теста:
// короткий вариант обязан быть примерно вдвое короче полного, то есть ядро плюс
// максимум два опциональных блока — трёх в бюджет уже не влезает.

import { getExperiment, pickVariant } from './experiments';

// Идентификаторы блоков в каноническом порядке страницы
export const LANDING_BLOCKS = [
  'hero',       // 1103 px — оффер, факты, кнопки
  'comparison', // 1331 px — «Почему одного Claude или Codex мало»
  'cycle',      // 1581 px — «Один цикл работы с настроенным проектом»
  'author',     // 1230 px — «Учу тому, чем пользуюсь сам»
  'results',    // 1817 px — «Что будет на выходе»
  'audience',   // 1284 px — «Кому подойдёт»
  'program',    // 1918 px — «Программа обучения»
  'pricing',    // 2439 px — «Форматы участия»
  'why',        // 1206 px — «Чем это отличается от других курсов»
  'faq',        // 1026 px — «Как проходит обучение: вопросы и ответы»
] as const;

export type LandingBlock = (typeof LANDING_BLOCKS)[number];

// Состав для гостя по итогам теста vibe_landing_blocks (закрыт 2026-10-10, цифры
// в реестре экспериментов): ядро плюс схема одного цикла работы. Остальные блоки
// в коде страницы остаются — их показывают оплатившему и могут вернуть следующие тесты.
export const VIBE_GUEST_BLOCKS: readonly LandingBlock[] = ['hero', 'cycle', 'results', 'pricing', 'faq'];

// ── Ступень 2: пары блоков ──────────────────────────────────────────────────
// К победителю ступени 1 добавляем по одному второму блоку — из тех, что в ступени 1
// не отодвинули тарифы: «почему одного Claude мало» (перед схемой) и «чем отличается
// от других» с гарантией (после тарифов). Блок автора в ступени 1 проиграл — его нет.
const PAIR_SETS: Record<string, readonly LandingBlock[]> = {
  winner: VIBE_GUEST_BLOCKS,
  plus_proof: ['hero', 'comparison', 'cycle', 'results', 'pricing', 'faq'],
  plus_why: ['hero', 'cycle', 'results', 'pricing', 'why', 'faq'],
};

// Cookie с выбранным вариантом. Жребий держим сутки: набор блоков — это вся страница,
// и вернувшемуся через неделю честнее показать свежий сценарий.
export const LANDING_PAIRS_COOKIE = 'vlp';
export const LANDING_PAIRS_TTL = 60 * 60 * 24;

export function isPairsVariant(value: unknown): value is string {
  return typeof value === 'string' && value in PAIR_SETS;
}

// В семя идёт номер суток: после протухания cookie выпадет другой сценарий,
// а в течение дня — всегда один и тот же
export function rollPairsVariant(visitorId: string, now: number = Date.now()): string {
  const day = Math.floor(now / (LANDING_PAIRS_TTL * 1000));
  return pickVariant(getExperiment('vibe_landing_pairs'), `${visitorId}:${day}`);
}

// Вариант считаем на сервере: иначе страница сначала отрисуется одним набором
// и перестроится на глазах. Порядок: ручной выбор для QA → запомненный жребий → свежий.
// Закрытый тест запомненный жребий игнорирует — всем победитель.
export function pickLandingPairs(
  { visitorId, remembered, forced }: { visitorId: string | null; remembered?: string | null; forced?: string | null },
): { variant: string; blocks: readonly LandingBlock[] } {
  const open = getExperiment('vibe_landing_pairs').status === 'running';
  const variant = isPairsVariant(forced)
    ? forced
    : open && isPairsVariant(remembered)
      ? remembered
      : rollPairsVariant(visitorId ?? 'anonymous');
  return { variant, blocks: PAIR_SETS[variant] ?? VIBE_GUEST_BLOCKS };
}
