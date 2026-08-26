export const SITE_URL = 'https://gelato.education';
// Временная точка перехода до готовности основного продажного лендинга.
export const PROGRAM_URL = 'https://vibe.gelato.education';
export const TELEGRAM_URL = 'https://t.me/gelato_ai';

export type FreeLessonFaq = {
  question: string;
  answer: string;
};

export type FreeLessonContent = {
  lessonId: '01' | '02' | '03' | '04';
  h1: string;
  lead: string;
  outcomes: readonly [string, string, string];
  bridgeTitle: string;
  bridgeText: string;
  ctaLabel: string;
  seoTitle: string;
  seoDescription: string;
  faq: readonly FreeLessonFaq[];
};

const COURSE_SLUG = 'claude-code';

const LESSONS: Record<number, FreeLessonContent> = {
  1: {
    lessonId: '01',
    h1: 'Как получать от AI больше — быстрее, качественнее и дешевле',
    lead: 'Разберём, почему результат зависит не от «волшебного» инструмента, а от того, как вы ставите задачу, передаёте контекст и проверяете ответ.',
    outcomes: [
      'Понимаете, почему инструмент сам по себе не решает задачу.',
      'Видите три направления оптимизации: время, качество и стоимость.',
      'Получаете рамку, которая связывает следующие уроки в единую систему.',
    ],
    bridgeTitle: 'Экономия начинается не с коротких промптов, а с правильного процесса',
    bridgeText: 'Отдельные советы помогают работать быстрее. Но устойчивый результат появляется, когда проект сам передаёт AI контекст, правила и критерии проверки. В Gelato Dev вы собираете именно такую систему.',
    ctaLabel: 'Посмотреть полный путь обучения',
    seoTitle: 'Как эффективно работать с AI и экономить токены — Gelato Dev',
    seoDescription: 'Бесплатный урок о системной работе с AI: как повысить скорость и качество результата, сократить лишние итерации и расходы токенов.',
    faq: [
      { question: 'Подойдёт ли урок без опыта программирования?', answer: 'Да. Принципы постановки задач, контекста и проверки полезны и вайбкодерам, и программистам.' },
      { question: 'Этот урок привязан только к Claude Code?', answer: 'Нет. Подход применим к Claude Code, ChatGPT и другим моделям, которые работают с вашим контекстом.' },
    ],
  },
  2: {
    lessonId: '02',
    h1: 'Как объяснять задачу AI, чтобы он не додумывал за вас',
    lead: 'Покажу, почему универсального «идеального промпта» не существует и какие детали действительно помогают модели понять задачу.',
    outcomes: [
      'Понимаете роль контекста в качестве ответа модели.',
      'Перестаёте искать универсальную секретную формулу промпта.',
      'Умеете давать конкретную обратную связь и использовать голос для полноты задачи.',
    ],
    bridgeTitle: 'Хороший промпт помогает всего один раз',
    bridgeText: 'Если каждый раз заново рассказывать про проект, качество будет зависеть от удачи. Научим настраивать контекст и правила.',
    ctaLabel: 'Как правильно настроить проект?',
    seoTitle: 'Промпт-инжиниринг: как давать AI контекст — Gelato Dev',
    seoDescription: 'Бесплатный урок по промпт-инжинирингу: как ставить AI конкретные задачи, передавать контекст и давать полезную обратную связь.',
    faq: [
      { question: 'Нужен ли специальный шаблон промпта?', answer: 'Нет. Структура помогает, но важнее полнота контекста, ограничения и понятный критерий результата.' },
      { question: 'Можно ли ставить задачи голосом?', answer: 'Да. Голос часто помогает быстрее передать детали, но задачу всё равно стоит проверить на конкретность.' },
    ],
  },
  3: {
    lessonId: '03',
    h1: 'Куда уходят токены в Claude Code и как не тратить лимиты впустую',
    lead: 'Посмотрим, что на самом деле съедает контекст и почему расплывчатая задача часто обходится дороже длинного промпта.',
    outcomes: [
      'Видите основные причины повышенного расхода токенов.',
      'Понимаете связь между неопределённой задачей и лишним поиском модели.',
      'Можете начать сокращать не слова, а ненужную работу.',
    ],
    bridgeTitle: 'Лимиты экономит не жёсткая экономия текста, а архитектура контекста',
    bridgeText: 'Нужно понимать, что хранить в CLAUDE.md, что вынести в rules и skills, когда использовать память и как ограничивать область задачи. В Gelato Dev эти элементы собираются в управляемую систему.',
    ctaLabel: 'Посмотреть систему работы с контекстом',
    seoTitle: 'Токены и лимиты Claude Code: причины расхода — Gelato Dev',
    seoDescription: 'Почему Claude Code расходует лимиты и как экономить токены с помощью ясных задач, изолированных чатов и правильной архитектуры контекста.',
    faq: [
      { question: 'Нужно ли делать промпты максимально короткими?', answer: 'Нет. Полезные детали обычно дешевле, чем лишний поиск и переделки из-за неясной задачи.' },
      { question: 'Стоит ли хранить все правила в CLAUDE.md?', answer: 'Нет. В основном файле лучше оставлять только постоянно нужный контекст, а специальные инструкции выносить в rules и skills.' },
    ],
  },
  4: {
    lessonId: '04',
    h1: 'Почему AI выдумывает ответы и как заставить его проверять себя',
    lead: 'Разберём, откуда берутся галлюцинации и почему правила, узкие агенты и автоматические проверки работают лучше просьбы «не ошибайся».',
    outcomes: [
      'Понимаете основные причины галлюцинаций модели.',
      'Знаете, как разрешить модели честно отвечать «не знаю».',
      'Видите роль rules, skills и специализированных агентов.',
    ],
    bridgeTitle: 'Меньше галлюцинаций — ещё не значит проверяемый результат',
    bridgeText: 'Даже хорошо настроенную модель нужно проверять. Полный workflow включает агентов-ревьюеров, типизацию, линтеры и тесты — чтобы качество подтверждалось, а не принималось на веру.',
    ctaLabel: 'Посмотреть полный путь до проверяемого результата',
    seoTitle: 'Галлюцинации AI: rules, skills и агенты — Gelato Dev',
    seoDescription: 'Бесплатный урок о галлюцинациях AI: как правила, специализированные агенты, типизация и тесты делают результат проверяемым.',
    faq: [
      { question: 'Можно ли полностью исключить галлюцинации?', answer: 'Нет, но можно заметно снизить их вероятность и не пропускать ошибки с помощью ограничений и автоматических проверок.' },
      { question: 'Зачем нужны отдельные агенты?', answer: 'Узкая роль уменьшает неоднозначность: агент получает только подходящие инструкции, контекст и критерии проверки.' },
    ],
  },
};

export function getFreeLessonContent(courseSlug: string, lessonNumber: number): FreeLessonContent | null {
  return courseSlug === COURSE_SLUG ? LESSONS[lessonNumber] ?? null : null;
}

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function buildProgramUrl(
  lesson: FreeLessonContent,
  searchParams: Record<string, SearchValue> = {},
): string {
  const url = new URL(PROGRAM_URL);
  const defaults = {
    source: 'free_lesson',
    medium: 'lesson',
    campaign: 'gelato_dev',
    content: `lesson_${lesson.lessonId}`,
  };

  for (const [key, fallback] of Object.entries(defaults)) {
    url.searchParams.set(key, fallback);
  }
  url.searchParams.set('lesson_id', lesson.lessonId);

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const) {
    const plainKey = key.slice(4) as keyof typeof defaults;
    url.searchParams.set(key, first(searchParams[key]) || first(searchParams[plainKey]) || defaults[plainKey]);
  }

  return url.toString();
}

export function isoDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds < 1) return undefined;
  const whole = Math.round(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${secs || (!hours && !minutes) ? `${secs}S` : ''}`;
}
