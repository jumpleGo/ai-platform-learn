// Реестр A/B-тестов. Один источник правды: отсюда читают и компоненты (какой вариант
// показать), и scripts/ab-report.mjs (что и как считать). Правило проекта: если непонятно,
// какое решение лучше, — не спорим, а заводим тест здесь и смотрим цифры.
//
// Жизненный цикл: status 'running' → накопили экспозиции → отчёт → решение пользователя →
// status 'done' + winner (код проигравшего варианта удаляем отдельным коммитом).
import { hashSeed } from './banners';

// 'planned' — тест описан, но ещё не запущен: ступень лестницы, которая стартует
// после закрытия предыдущей. Отчёт такие пропускает, жребий по ним не бросается.
export type ExperimentStatus = 'planned' | 'running' | 'done';

export type Experiment = {
  key: string;
  // Что проверяем и почему — чтобы через месяц было понятно без git blame
  hypothesis: string;
  // Первый вариант — контроль (текущее поведение)
  variants: readonly string[];
  // Доли показов, в сумме 1. По умолчанию делим поровну
  weights?: readonly number[];
  // Дата запуска, ISO. Отчёт считает события только после неё
  startedAt: string;
  // На каких страницах живёт тест — для отчёта и чтобы не считать чужие события
  pathPrefix: string;
  // Главная метрика: событие, по доле дошедших до которого сравниваем варианты
  primaryMetric: string;
  // Второстепенные метрики — тоже события PostHog
  secondaryMetrics?: readonly string[];
  // Сколько экспозиций на вариант нужно, чтобы отчёт считался достоверным
  minExposuresPerVariant: number;
  // Добавить в отчёт медиану долистывания страницы по варианту (из $pageleave).
  // Нужно там, где тестируется длина страницы, а не элемент на ней.
  reportScrollDepth?: boolean;
  status: ExperimentStatus;
  winner?: string;
  decisionNote?: string;
};

export const EXPERIMENTS = {
  lessonQuizBanner: {
    key: 'lesson_quiz_banner',
    hypothesis:
      'На телефоне плашка «Подобрали под вашу задачу» закрывает плеер, и видео не запускают ' +
      '(8 переходов с теста, 0 стартов). Компактная полоска не мешает плееру и поднимет video_start.',
    variants: ['control', 'compact'],
    startedAt: '2026-09-10',
    pathPrefix: '/courses/claude-code/lessons/',
    primaryMetric: 'video_start',
    secondaryMetrics: ['video_25', 'telegram_click', 'lesson_cta_click'],
    minExposuresPerVariant: 40,
    status: 'running',
  },
  vibeLandingFreeCta: {
    key: 'vibe_landing_free_cta',
    hypothesis:
      'Гость на лендинге вибкода видит только «К тарифам» и пейволл: из ~50 дошедших до лендингов ' +
      'курса урок открывают 7 (14%). Первичная кнопка в бесплатный урок (как на лендинге agents) ' +
      'подняет долю дошедших до lesson_view. Перезапущен 13 сентября: до этого кнопка вела ' +
      'в первый урок другого курса и жребий считался на клиенте, из-за чего кнопок не было ' +
      'до гидратации — старые данные непригодны.',
    variants: ['control', 'free_lesson'],
    startedAt: '2026-09-13',
    pathPrefix: '/courses',
    primaryMetric: 'lesson_view',
    secondaryMetrics: ['video_start', 'quiz_started', 'pricing_viewed', 'tariff_selected'],
    minExposuresPerVariant: 40,
    status: 'running',
  },
  vibeLandingBlocks: {
    key: 'vibe_landing_blocks',
    hypothesis:
      'Лендинг вайбкода — 16 949 px (~22 экрана): медиана долистывания 42%, до блока тарифов ' +
      '12 сентября не дошёл никто из семи, при этом читают внимательно (медиана 110 с). ' +
      'Дело не в содержании, а в длине. Полную страницу сняли с показа совсем; контроль — голое ядро ' +
      '(оффер, результат, тарифы, вопросы-ответы), остальные варианты добавляют к нему по одному ' +
      'опциональному блоку. Вопрос ступени 1: какой блок окупает свой экран ростом pricing_viewed, ' +
      'а какой только отодвигает тарифы.',
    // Контроль — `base`, голое ядро. Наборы описаны в src/lib/landing-blocks.ts:
    // каждый вариант назван по опциональному блоку, который к ядру добавляет.
    variants: ['base', 'proof', 'cycle', 'author', 'audience', 'program', 'why'],
    startedAt: '2026-09-12',
    pathPrefix: '/courses/vibecoding',
    primaryMetric: 'pricing_viewed',
    secondaryMetrics: ['tariff_selected', 'payment_started', 'lesson_view', 'telegram_click'],
    minExposuresPerVariant: 60,
    reportScrollDepth: true,
    status: 'running',
  },
  vibeHeroCopy: {
    key: 'vibe_hero_copy',
    hypothesis:
      'Первый экран лендинга вайбкода говорит метафорой («из няньки в тимлида») и ничего не обещает ' +
      'по деньгам. Гипотеза: заголовок с конкретными инструментами (skills, линтеры, типы, автотесты) ' +
      'быстрее объясняет холодному человеку из Threads, о чём курс, а подзаголовок про найм и вилку ' +
      'от 150 000 ₽ даёт причину читать дальше. Разложено на 2×2, чтобы видеть вклад заголовка ' +
      'и подзаголовка по отдельности.',
    variants: ['control', 'keywords', 'salary', 'both'],
    startedAt: '2026-09-13',
    pathPrefix: '/courses/vibecoding',
    primaryMetric: 'pricing_viewed',
    secondaryMetrics: ['tariff_selected', 'payment_started', 'lesson_view', 'telegram_click'],
    minExposuresPerVariant: 60,
    reportScrollDepth: true,
    status: 'running',
  },
  vibeLandingPairs: {
    key: 'vibe_landing_pairs',
    hypothesis:
      'Ступень 2, стартует после vibe_landing_blocks. К ядру и блоку-победителю добавляем второй ' +
      'опциональный блок (пара — это ~55% контроля, на экран длиннее одиночного набора): окупается ' +
      'ли второй блок ростом tariff_selected или короче всегда лучше. Контроль — набор-победитель.',
    variants: ['winner', 'plus_first', 'plus_second', 'plus_third'],
    startedAt: '2026-09-12',
    pathPrefix: '/courses/vibecoding',
    primaryMetric: 'tariff_selected',
    secondaryMetrics: ['pricing_viewed', 'payment_started'],
    minExposuresPerVariant: 60,
    reportScrollDepth: true,
    status: 'planned',
  },
  vibeLandingOrder: {
    key: 'vibe_landing_order',
    hypothesis:
      'Ступень 3, стартует после vibe_landing_pairs. Состав блоков зафиксирован, меняется порядок ' +
      'и место тарифов: канон (тарифы ближе к концу), тарифы сразу после оффера, тарифы дважды ' +
      '(врезка с ценой в хиро плюс полный блок). Контроль — канонический порядок.',
    variants: ['tail', 'early', 'both'],
    startedAt: '2026-09-12',
    pathPrefix: '/courses/vibecoding',
    primaryMetric: 'tariff_selected',
    secondaryMetrics: ['pricing_viewed', 'payment_started'],
    minExposuresPerVariant: 60,
    reportScrollDepth: true,
    status: 'planned',
  },
} as const satisfies Record<string, Experiment>;

export type ExperimentKey = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS]['key'];

export function getExperiment(key: ExperimentKey): Experiment {
  const found = Object.values(EXPERIMENTS).find((e) => e.key === key);
  if (!found) throw new Error(`Неизвестный эксперимент: ${key}`);
  return found;
}

// Детерминированный жребий: один посетитель всегда попадает в один вариант,
// без хранения состояния — достаточно cookie vid из proxy.ts
export function pickVariant(experiment: Experiment, visitorId: string): string {
  if (experiment.status === 'done' && experiment.winner) return experiment.winner;
  // Незапущенный тест всем отдаёт контроль: описание уже в реестре, показов ещё нет
  if (experiment.status === 'planned') return experiment.variants[0];
  const roll = hashSeed(`${experiment.key}:${visitorId}`) / 0x1_0000_0000;
  const weights = experiment.weights ?? experiment.variants.map(() => 1 / experiment.variants.length);
  let acc = 0;
  for (let i = 0; i < experiment.variants.length; i++) {
    acc += weights[i];
    if (roll < acc) return experiment.variants[i];
  }
  return experiment.variants[experiment.variants.length - 1];
}
