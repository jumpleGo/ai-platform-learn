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
// обещанного результата и цены лендинг перестаёт быть лендингом, а вопросы-ответы
// снимают возражения перед оплатой и стоят всего 1 026 px.
export const CORE_BLOCKS: readonly LandingBlock[] = ['hero', 'results', 'pricing', 'faq'];

// Остальное — опционально: каждый блок кому-то помогает, но вместе они дают 22 экрана
export const OPTIONAL_BLOCKS: readonly LandingBlock[] = LANDING_BLOCKS.filter(
  (b) => !CORE_BLOCKS.includes(b),
);

// Наборы блоков по вариантам теста. Контроль — `base`: голое ядро, самая короткая
// страница из возможных. Каждый следующий вариант добавляет к ядру ровно один
// опциональный блок и отвечает на вопрос «стоит ли этот блок своего экрана».
// Полная страница (все 10 блоков, 16 949 px) в ротации больше не участвует.
const BLOCK_SETS: Record<string, readonly LandingBlock[]> = {
  base: CORE_BLOCKS,                                                   // ядро без добавок
  proof: ['hero', 'comparison', 'results', 'pricing', 'faq'],          // + почему одного Claude мало
  cycle: ['hero', 'cycle', 'results', 'pricing', 'faq'],               // + один цикл работы
  author: ['hero', 'author', 'results', 'pricing', 'faq'],             // + блок об авторе
  audience: ['hero', 'results', 'audience', 'pricing', 'faq'],         // + кому подойдёт
  program: ['hero', 'results', 'program', 'pricing', 'faq'],           // + программа обучения
  why: ['hero', 'results', 'pricing', 'why', 'faq'],                   // + чем отличается от других
};

// Cookie с выбранным вариантом. Жребий держим сутки, а не год: набор блоков —
// это вся страница целиком, и человеку, который вернулся через неделю, честнее
// показать новый сценарий, чем вечно держать его на одном.
export const LANDING_BLOCKS_COOKIE = 'vlb';
export const LANDING_BLOCKS_TTL = 60 * 60 * 24;

export function isLandingVariant(value: unknown): value is string {
  return typeof value === 'string' && value in BLOCK_SETS;
}

export function blocksForVariant(variant: string): readonly LandingBlock[] {
  return BLOCK_SETS[variant] ?? LANDING_BLOCKS;
}

// Жребий на сутки: в семя идёт номер суток, поэтому после протухания cookie
// посетителю выпадет уже другой сценарий, а в течение дня — всегда один и тот же.
export function rollLandingVariant(visitorId: string, now: number = Date.now()): string {
  const day = Math.floor(now / (LANDING_BLOCKS_TTL * 1000));
  return pickVariant(getExperiment('vibe_landing_blocks'), `${visitorId}:${day}`);
}

// Вариант считаем на сервере: иначе короткая страница сначала отрисуется полной
// и «схлопнется» на глазах у посетителя, испортив и замер длины.
// Порядок: ручной выбор для QA → запомненный на сутки жребий → свежий жребий.
export function pickLandingBlocks(
  { visitorId, remembered, forced }: { visitorId: string | null; remembered?: string | null; forced?: string | null },
): { variant: string; blocks: readonly LandingBlock[] } {
  const variant = isLandingVariant(forced)
    ? forced
    : isLandingVariant(remembered)
      ? remembered
      : rollLandingVariant(visitorId ?? 'anonymous');
  return { variant, blocks: blocksForVariant(variant) };
}

// ── Тест копии хиро ───────────────────────────────────────────────────────────
// Отдельный жребий от набора блоков: тесты ортогональны, каждый набор блоков
// встречается со всеми вариантами заголовка, поэтому эффекты не путаются.
export type HeroCopy = { h1: string; lead: string };

// Контроль — то, что стоит на странице сейчас; остальные варианты меняют
// заголовок, подзаголовок или оба сразу, чтобы было видно вклад каждого.
const HERO_COPY: Record<string, HeroCopy | null> = {
  control: null,
  keywords: {
    h1: 'Вайбкодинг на инженерных рельсах: skills, линтеры, типы и автотесты',
    lead:
      'Обучаем ИИ правилам твоего репозитория: CLAUDE.md, rules, статический анализ и тесты.\n' +
      'Модель сама исправляет ошибки по тестам и предлагает чистые изолированные коммиты.',
  },
  salary: {
    h1: 'Из няньки для нейросети — в тимлида агентов.',
    lead:
      'Вайбкодеров, которые владеют инженерным подходом, уже нанимают сильные команды — вилки начинаются от 150 000 ₽.\n' +
      'Учим ровно этому: правила репозитория, линтеры, типы, автотесты и чистые коммиты.',
  },
  both: {
    h1: 'Вайбкодинг на инженерных рельсах: skills, линтеры, типы и автотесты',
    lead:
      'Вайбкодеров, которые владеют инженерным подходом, уже нанимают сильные команды — вилки начинаются от 150 000 ₽.\n' +
      'Учим ровно этому: правила репозитория, линтеры, типы, автотесты и чистые коммиты.',
  },
};

export const HERO_COPY_COOKIE = 'vhc';

export function isHeroVariant(value: unknown): value is string {
  return typeof value === 'string' && value in HERO_COPY;
}

export function rollHeroVariant(visitorId: string, now: number = Date.now()): string {
  const day = Math.floor(now / (LANDING_BLOCKS_TTL * 1000));
  return pickVariant(getExperiment('vibe_hero_copy'), `${visitorId}:${day}`);
}

// null — показываем хиро как есть (контроль с ручными подчёркиваниями в разметке)
export function pickHeroCopy(
  { visitorId, remembered, forced }: { visitorId: string | null; remembered?: string | null; forced?: string | null },
): { variant: string; copy: HeroCopy | null } {
  const variant = isHeroVariant(forced)
    ? forced
    : isHeroVariant(remembered)
      ? remembered
      : rollHeroVariant(visitorId ?? 'anonymous');
  return { variant, copy: HERO_COPY[variant] ?? null };
}
