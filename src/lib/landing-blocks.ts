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

// Блоки, которые нужны всем и не выключаются ни в одном варианте: без оффера,
// обещанного результата и цены лендинг перестаёт быть лендингом.
export const CORE_BLOCKS: readonly LandingBlock[] = ['hero', 'results', 'pricing'];

// Остальное — опционально: каждый блок кому-то помогает, но вместе они дают 22 экрана
export const OPTIONAL_BLOCKS: readonly LandingBlock[] = LANDING_BLOCKS.filter(
  (b) => !CORE_BLOCKS.includes(b),
);

// Наборы блоков по вариантам теста. Первый — контроль (текущая полная страница).
// Ступень 1 проверяет опциональные блоки поодиночке: ядро плюс один блок даёт
// 48-51% высоты контроля, то есть ровно «вдвое короче». Пара опциональных блоков
// в этот бюджет уже не влезает (~55%, шапка и подвал добавляют ~1 050 px
// независимо от состава) — пары идут ступенью 2, когда известен лучший одиночный блок.
const BLOCK_SETS: Record<string, readonly LandingBlock[]> = {
  full: LANDING_BLOCKS,                                  // 16 949 px — контроль
  proof: ['hero', 'comparison', 'results', 'pricing'],   //  8 129 px (48%)
  cycle: ['hero', 'cycle', 'results', 'pricing'],        //  8 379 px (49%)
  author: ['hero', 'author', 'results', 'pricing'],      //  8 028 px (47%)
  audience: ['hero', 'results', 'audience', 'pricing'],  //  8 082 px (48%)
  program: ['hero', 'results', 'program', 'pricing'],    //  8 716 px (51%)
  why: ['hero', 'results', 'pricing', 'why'],            //  8 004 px (47%)
  faq: ['hero', 'results', 'pricing', 'faq'],            //  7 824 px (46%)
};

export function blocksForVariant(variant: string): readonly LandingBlock[] {
  return BLOCK_SETS[variant] ?? LANDING_BLOCKS;
}

// Вариант считаем на сервере по cookie vid: иначе короткая страница сначала
// отрисуется полной и «схлопнется» на глазах у посетителя, испортив и замер длины.
export function pickLandingBlocks(visitorId: string | null, forced?: string | null): {
  variant: string;
  blocks: readonly LandingBlock[];
} {
  const experiment = getExperiment('vibe_landing_blocks');
  const variant =
    forced && experiment.variants.includes(forced)
      ? forced
      : pickVariant(experiment, visitorId ?? 'anonymous');
  return { variant, blocks: blocksForVariant(variant) };
}
