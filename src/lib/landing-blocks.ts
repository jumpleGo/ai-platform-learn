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

// ── Лендинг новичков (claude-code-agents): тест длины ─────────────────────────
// Своя шкала блоков: у курса для новичков есть секции, которых нет у вайбкода
// (примеры результата, отзывы, что нужно для старта), и нет цикла работы и сравнения.
// Замеры 2026-10-10 (390×844, dev): полная страница — 16 379 px (~19 экранов),
// ядро — 10 529 px (~12,5 экрана).
export const AGENTS_LANDING_BLOCKS = [
  'hero',         // 1260 px — оффер, кнопки, факты
  'author',       //  668 px — «Учу тому, чем пользуюсь сам»
  'results',      // 1214 px — «Чему вы научитесь»
  'examples',     // 1089 px — «Что может быть на выходе»
  'testimonials', //  902 px — отзывы учениц (на них ведёт кнопка из хиро)
  'audience',     //  558 px — «Кому подойдёт»
  'requirements', //  588 px — «Что нужно для старта»
  'program',      // 2264 px — «Программа обучения» с условиями
  'pricing',      // 3148 px — «Форматы участия»
  'why',          // 1293 px — «Чем это отличается от других курсов»
  'faq',          // 1222 px — вопросы и ответы
] as const;

export type AgentsLandingBlock = (typeof AGENTS_LANDING_BLOCKS)[number];

// Ядро: без оффера, обещанного результата, живых отзывов (хиро ведёт на них якорем),
// цены и ответов на возражения страница перестаёт продавать. Примеры «что может быть
// на выходе» остаются: новичку они понятнее абстрактного «научитесь».
export const AGENTS_CORE_BLOCKS: readonly AgentsLandingBlock[] = [
  'hero', 'results', 'examples', 'testimonials', 'pricing', 'faq',
];

// Наборы по вариантам теста. Контроль — текущая полная страница; `core` — ядро
// примерно вдвое короче. На лендинге вайбкода блоки перед тарифами (программа,
// «кому подойдёт») резали доходимость до цен — проверяем то же на новичках.
export const AGENTS_BLOCK_SETS: Record<string, readonly AgentsLandingBlock[]> = {
  control: AGENTS_LANDING_BLOCKS,
  core: AGENTS_CORE_BLOCKS,
};

// Cookie с вариантом: сутки, как и у теста вайбкода, — вернувшемуся через неделю
// честнее показать новый сценарий, чем держать его на одном.
export const AGENTS_BLOCKS_COOKIE = 'alb';
export const AGENTS_BLOCKS_TTL = 60 * 60 * 24;

export function isAgentsLandingVariant(value: unknown): value is string {
  return typeof value === 'string' && value in AGENTS_BLOCK_SETS;
}

export function agentsBlocksForVariant(variant: string): readonly AgentsLandingBlock[] {
  return AGENTS_BLOCK_SETS[variant] ?? AGENTS_LANDING_BLOCKS;
}

// Жребий на сутки: в семя идёт номер суток, после протухания cookie посетителю
// выпадет новый сценарий, а в течение дня — всегда один и тот же.
export function rollAgentsLandingVariant(visitorId: string, now: number = Date.now()): string {
  const day = Math.floor(now / (AGENTS_BLOCKS_TTL * 1000));
  return pickVariant(getExperiment('agents_landing_blocks'), `${visitorId}:${day}`);
}

// Вариант считаем на сервере: иначе короткая страница сначала отрисуется полной
// и «схлопнется» на глазах у посетителя. Порядок: ручной выбор для QA → запомненный
// на сутки жребий → свежий жребий.
export function pickAgentsBlocks(
  { visitorId, remembered, forced }: { visitorId: string | null; remembered?: string | null; forced?: string | null },
): { variant: string; blocks: readonly AgentsLandingBlock[] } {
  const variant = isAgentsLandingVariant(forced)
    ? forced
    : isAgentsLandingVariant(remembered)
      ? remembered
      : rollAgentsLandingVariant(visitorId ?? 'anonymous');
  return { variant, blocks: agentsBlocksForVariant(variant) };
}
