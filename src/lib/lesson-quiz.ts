import { nbspDeep } from '@/lib/typography';

export const LESSON_QUIZ_TTL_MS = 12 * 60 * 60 * 1000;

export type LessonQuizResultId = 'prompting' | 'tokens' | 'hallucinations';

export type LessonQuizResult = {
  id: LessonQuizResultId;
  verdict: string;
  explanation: string;
  lessonTitle: string;
  lessonNumber: 2 | 3 | 4;
  href: string;
};

export type LessonQuizOption = {
  label: string;
  scores: Partial<Record<LessonQuizResultId, number>>;
};

export type LessonQuizQuestion = {
  id: string;
  eyebrow: string;
  question: string;
  options: readonly LessonQuizOption[];
};

const QUESTIONS: readonly LessonQuizQuestion[] = [
  {
    id: 'return',
    eyebrow: 'Вопрос первый',
    question: 'Что чаще всего идёт не так?',
    options: [
      {
        label: 'ИИ неправильно понимает задачу',
        scores: { prompting: 3, hallucinations: 1 },
      },
      {
        label: 'Слишком быстро кончаются лимиты',
        scores: { tokens: 3, prompting: 1 },
      },
      {
        label: 'Ответам нельзя доверять',
        scores: { hallucinations: 3 },
      },
    ],
  },
  {
    id: 'second_try',
    eyebrow: 'Вопрос второй',
    question: 'На что уходит больше всего времени?',
    options: [
      {
        label: 'Объясняю задачу заново',
        scores: { prompting: 3, tokens: 1 },
      },
      {
        label: 'Начинаю новые чаты',
        scores: { tokens: 3, prompting: 1 },
      },
      {
        label: 'Проверяю каждый ответ',
        scores: { hallucinations: 3 },
      },
    ],
  },
  {
    id: 'superpower',
    eyebrow: 'Последний вопрос',
    question: 'Что хотите исправить первым?',
    options: [
      {
        label: 'Получать точные ответы',
        scores: { prompting: 4 },
      },
      {
        label: 'Тратить меньше токенов',
        scores: { tokens: 4 },
      },
      {
        label: 'Убрать выдуманные факты',
        scores: { hallucinations: 4 },
      },
    ],
  },
];

const RESULTS: readonly LessonQuizResult[] = [
  {
    id: 'prompting',
    verdict: 'Вам не нужен «секретный промпт»',
    explanation:
      'ИИ не хватает контекста и чёткого результата. Научим ставить задачу так, чтобы он не угадывал.',
    lessonTitle: 'Промпт-инжиниринг простым языком',
    lessonNumber: 2,
    href: '/courses/claude-code/lessons/2?source=pain_quiz&utm_source=gelateria&utm_medium=quiz&utm_campaign=free_lesson_match&utm_content=prompting',
  },
  {
    id: 'tokens',
    verdict: 'У вас утекают не токены, а лишняя работа',
    explanation:
      'ИИ тратит лимиты, когда ищет слишком широко. Покажем, как ограничить задачу и убрать лишнюю работу.',
    lessonTitle: 'Почему лимиты уходят впустую',
    lessonNumber: 3,
    href: '/courses/claude-code/lessons/3?source=pain_quiz&utm_source=gelateria&utm_medium=quiz&utm_campaign=free_lesson_match&utm_content=tokens',
  },
  {
    id: 'hallucinations',
    verdict: 'Вам нужна страховка от уверенных выдумок',
    explanation:
      'ИИ не умеет вовремя остановиться. Покажем, как снизить количество выдумок с помощью правил и проверок.',
    lessonTitle: 'Почему ИИ выдумывает ответы',
    lessonNumber: 4,
    href: '/courses/claude-code/lessons/4?source=pain_quiz&utm_source=gelateria&utm_medium=quiz&utm_campaign=free_lesson_match&utm_content=hallucinations',
  },
];

export const LESSON_QUIZ_QUESTIONS: readonly LessonQuizQuestion[] = nbspDeep(QUESTIONS);
export const LESSON_QUIZ_RESULTS: readonly LessonQuizResult[] = nbspDeep(RESULTS);

export function getLessonQuizResult(id: string): LessonQuizResult | null {
  return LESSON_QUIZ_RESULTS.find((result) => result.id === id) ?? null;
}

// При равенстве побеждает вариант, который появился в ответах раньше: так итог
// определяется выбором человека, а не случайным порядком ключей объекта.
export function pickLessonQuizResult(answers: readonly number[]): LessonQuizResult {
  const totals: Partial<Record<LessonQuizResultId, number>> = {};
  const order: LessonQuizResultId[] = [];

  answers.forEach((choice, questionIndex) => {
    const option = LESSON_QUIZ_QUESTIONS[questionIndex]?.options[choice];
    if (!option) return;
    for (const [id, score] of Object.entries(option.scores) as [LessonQuizResultId, number][]) {
      if (!(id in totals)) order.push(id);
      totals[id] = (totals[id] ?? 0) + score;
    }
  });

  const winner = order.reduce(
    (best, id) => ((totals[id] ?? 0) > (totals[best] ?? 0) ? id : best),
    order[0] ?? 'prompting',
  );
  return getLessonQuizResult(winner) ?? LESSON_QUIZ_RESULTS[0];
}
