// Тест-подбор обучения на витрине /courses. Считает баллы по slug курса
// и показывает победителя. Логика чистая — её же удобно проверять тестами.

import { nbspDeep } from '@/lib/typography';

export type QuizScores = Record<string, number>;

export type QuizOption = {
  label: string;
  note: string;
  scores: QuizScores;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: readonly QuizOption[];
};

const QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'now',
    question: 'Что у вас сейчас на руках?',
    options: [
      {
        label: 'Живой проект с пользователями',
        note: 'что-то уже работает, и трогать это страшно',
        scores: { vibecoding: 3, 'claude-code-agents': 1 },
      },
      {
        label: 'Идея, до кода не дошло',
        note: 'хочется собрать первую версию',
        scores: { 'claude-code-agents': 3, vibecoding: 1 },
      },
      {
        label: 'Чужая кодовая база',
        note: 'нужно внедрить ИИ в проект, который писали не вы',
        scores: { vibecoding: 3 },
      },
      {
        label: 'Ни кода, ни проекта',
        note: 'зато есть история, которую хочется показать',
        scores: { 'ai-cartoons': 3 },
      },
    ],
  },
  {
    id: 'goal',
    question: 'Что должно получиться в итоге?',
    options: [
      {
        label: 'Продукт, который не падает',
        note: 'ИИ пишет, проверки ловят ошибки до прода',
        scores: { vibecoding: 3 },
      },
      {
        label: 'Видео и мультики',
        note: 'ролик с героем, голосом и музыкой',
        scores: { 'ai-cartoons': 4 },
      },
      {
        label: 'Агенты, которые делают рутину',
        note: 'отдать ИИ повторяющиеся задачи',
        scores: { 'claude-code-agents': 4 },
      },
      {
        label: 'Свой сайт в интернете',
        note: 'от пустой папки до задеплоенного проекта',
        scores: { 'claude-code-agents': 3, vibecoding: 1 },
      },
    ],
  },
  {
    id: 'code',
    question: 'Как вы относитесь к коду?',
    options: [
      {
        label: 'Пишу код, это моя работа',
        note: 'нужен инженерный уровень, а не «привет, мир»',
        scores: { vibecoding: 3 },
      },
      {
        label: 'Что-то читаю, но не пишу',
        note: 'разбираюсь по ходу дела',
        scores: { 'claude-code-agents': 2, vibecoding: 1 },
      },
      {
        label: 'Код вижу впервые',
        note: 'и не планирую его писать руками',
        scores: { 'claude-code-agents': 2, 'ai-cartoons': 2 },
      },
    ],
  },
  {
    id: 'pain',
    question: 'Что раздражает больше всего?',
    options: [
      {
        label: 'ИИ ломает то, что работало',
        note: 'и узнаю об этом от пользователей',
        scores: { vibecoding: 4 },
      },
      {
        label: 'Каждый раз объясняю всё заново',
        note: 'новый чат — новая история про проект',
        scores: { 'claude-code-agents': 3, vibecoding: 1 },
      },
      {
        label: 'Генерации уходят в мусор',
        note: 'кадры не склеиваются, деньги тают',
        scores: { 'ai-cartoons': 4 },
      },
      {
        label: 'Не понимаю, с чего начать',
        note: 'инструментов много, системы нет',
        scores: { 'claude-code-agents': 3 },
      },
    ],
  },
];

export const QUIZ: readonly QuizQuestion[] = nbspDeep(QUESTIONS);

export type QuizResult = {
  slug: string;
  title: string;
  verdict: string;
  note: string;
};

const RESULTS: Record<string, QuizResult> = {
  vibecoding: {
    slug: 'it-vibecoding',
    title: 'Вайбкодим как инженер',
    verdict: 'Вам нужны страховки, а не новые промпты',
    note: 'У вас есть что ломать — значит, пора научить ИИ проверять себя: типы, тесты, линтер, CI и правила проекта.',
  },
  'claude-code-agents': {
    slug: 'claude-code-agents',
    title: 'Claude Code — свои агенты',
    verdict: 'Вам нужен рабочий процесс с нуля',
    note: 'Начинаем с установки и контекста, заканчиваем своими агентами и проектом, который живёт в интернете.',
  },
  'ai-cartoons': {
    slug: 'ai-cartoons',
    title: 'ИИ мультики',
    verdict: 'Вам нужен пайплайн, а не удачный кадр',
    note: 'История, лист персонажа, оживление и монтаж — чтобы ролик собирался каждый раз, а не «когда повезёт».',
  },
};

// Победитель по сумме баллов. При равенстве выигрывает курс, который встретился
// в ответах первым — так результат зависит от выбора, а не от порядка ключей.
export function pickQuizResult(answers: readonly number[]): QuizResult {
  const totals: QuizScores = {};
  const order: string[] = [];
  answers.forEach((choice, i) => {
    const option = QUIZ[i]?.options[choice];
    if (!option) return;
    for (const [slug, points] of Object.entries(option.scores)) {
      if (!(slug in totals)) order.push(slug);
      totals[slug] = (totals[slug] ?? 0) + points;
    }
  });
  const winner = order.reduce(
    (best, slug) => (totals[slug] > totals[best] ? slug : best),
    order[0] ?? 'claude-code-agents',
  );
  return nbspDeep(RESULTS[winner] ?? RESULTS['claude-code-agents']);
}
