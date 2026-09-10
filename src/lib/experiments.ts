// Реестр A/B-тестов. Один источник правды: отсюда читают и компоненты (какой вариант
// показать), и scripts/ab-report.mjs (что и как считать). Правило проекта: если непонятно,
// какое решение лучше, — не спорим, а заводим тест здесь и смотрим цифры.
//
// Жизненный цикл: status 'running' → накопили экспозиции → отчёт → решение пользователя →
// status 'done' + winner (код проигравшего варианта удаляем отдельным коммитом).
import { hashSeed } from './banners';

export type ExperimentStatus = 'running' | 'done';

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
  const roll = hashSeed(`${experiment.key}:${visitorId}`) / 0x1_0000_0000;
  const weights = experiment.weights ?? experiment.variants.map(() => 1 / experiment.variants.length);
  let acc = 0;
  for (let i = 0; i < experiment.variants.length; i++) {
    acc += weights[i];
    if (roll < acc) return experiment.variants[i];
  }
  return experiment.variants[experiment.variants.length - 1];
}
