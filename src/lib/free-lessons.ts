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
      'Поймёте, почему один инструмент сам по себе задачу не решает.',
      'Увидите, на что влияет ваша работа с ИИ: время, качество и деньги.',
      'Получите общую картину: как это складывается в рабочую систему.',
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
    h1: 'Промпт-инжиниринг простым языком.',
    lead: 'Расскажу как именно общаться с ИИ так, чтобы он понимал вас, а также разберем кейсы, когда ИИ может вас вообще не понимать и как это фиксить.',
    outcomes: [
      'Поймёте, почему ответ зависит от контекста, а не от удачной фразы.',
      'Перестанете искать секретный промпт: его просто нет.',
      'Научитесь объяснять задачу так, чтобы ИИ понял с первого раза.',
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
    h1: 'Почему лимиты уходят впустую.',
    lead: 'Посмотрим, что на самом деле съедает ваши лимиты и как сделать так, чтобы ИИ не лопатила все подряд без разбора.',
    outcomes: [
      'Увидите, куда на самом деле уходят ваши лимиты.',
      'Поймёте, почему из-за размытой задачи ИИ перерывает лишнее.',
      'Начнёте сокращать не слова в промпте, а лишнюю работу.',
    ],
    bridgeTitle: 'Лимиты экономит контекст',
    bridgeText: 'Нужно понимать, что хранить в CLAUDE.md, что вынести в rules и skills, когда использовать память и как ограничивать область задачи.',
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
    h1: 'Почему ИИ выдумывает ответы',
    lead: 'Разберём, откуда берутся галлюцинации и почему ИИ вообще решила вам врать и, главное, пофиксим это.',
    outcomes: [
      'Поймёте, почему ИИ уверенно выдумывает ответы.',
      'Научитесь разрешать ему честно сказать «не знаю».',
      'Увидите, зачем нужны правила, скиллы и отдельные агенты.',
    ],
    bridgeTitle: 'Нет галлюцинаций\n- не значит, что все идеально.',
    bridgeText: 'Даже хорошо настроенную модель нужно проверять. Полный workflow включает агентов-ревьюеров, типизацию, линтеры и тесты — чтобы качество подтверждалось с нескольких сторон.',
    ctaLabel: 'Разобраться, как сделать систему проверки',
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
