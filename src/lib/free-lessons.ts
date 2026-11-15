export const SITE_URL = 'https://gelato.education';
export const PROGRAM_URL = '/courses/vibecoding';
export const TELEGRAM_URL = 'https://t.me/gelato_ai';

export type FreeLessonFaq = {
  question: string;
  answer: string;
};

export type FreeLessonContent = {
  lessonId: '01' | '02' | '03' | '04' | '05';
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

export type LessonSeoContent = Pick<FreeLessonContent, 'h1' | 'seoTitle' | 'seoDescription'>;

// Вступление открыто бесплатно, полная программа платная. SEO-контент отдельно
// от воронки курса-хаба: вступление сохраняет обычную навигацию и материалы.
export const AGENTS_INTRO_LESSON = {
  courseSlug: 'claude-code-agents',
  number: 1,
  h1: 'Первый шаг в работе с ИИ: Claude Code с нуля',
  seoTitle: 'Claude Code с нуля: бесплатный вводный урок — GELATO',
  seoDescription: 'Бесплатный вводный урок для тех, кто ещё не работал с ИИ. Узнайте, что такое Claude Code и как начать решать свои задачи с его помощью без опыта программирования.',
} satisfies LessonSeoContent & { courseSlug: string; number: number };


// Временные локальные обложки бесплатных уроков. Загруженные через админку превью
// лежат в Firebase Storage, у которого сейчас отключён биллинг и вместо картинок
// приходит ошибка. Эти файлы едут вместе с деплоем и ни от чего не зависят;
// когда бакет оживёт — карту можно снести, ссылки из базы подхватятся сами.
export const LOCAL_LESSON_PREVIEWS: Record<string, string> = {
  'claude-code:2': '/previews/claude-code-02.webp', // Общение с ИИ
  'claude-code:3': '/previews/claude-code-03.webp', // Экономия лимитов
  'claude-code:4': '/previews/claude-code-04.webp', // Откуда галлюцинации
};

export function localLessonPreview(courseKey: string, number: number): string | null {
  return LOCAL_LESSON_PREVIEWS[`${courseKey}:${number}`] ?? null;
}

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
    bridgeText: 'Отдельные советы помогают работать быстрее. Но устойчивый результат появляется, когда проект сам передаёт AI контекст, правила и критерии проверки. В обучениях GELATO вы собираете именно такую систему.',
    ctaLabel: 'Посмотреть полный путь обучения',
    seoTitle: 'Как получать от ИИ больше: скорость, качество, цена — GELATO',
    seoDescription: 'Бесплатный урок о принципах работы с ИИ: почему результат зависит не от инструмента, а от того, как вы ставите задачу, передаёте контекст и проверяете ответ.',
    faq: [
      { question: 'Подойдёт ли урок без опыта программирования?', answer: 'Да. Принципы постановки задач, контекста и проверки полезны и вайбкодерам, и программистам.' },
      { question: 'Этот урок привязан только к Claude Code?', answer: 'Нет. Подход применим к Claude Code, ChatGPT и другим моделям, которые работают с вашим контекстом.' },
    ],
  },
  2: {
    lessonId: '02',
    h1: 'Промпт-инжиниринг простым языком',
    lead: 'Расскажу как именно общаться с ИИ так, чтобы он понимал вас, а также разберем кейсы, когда ИИ может вас вообще не понимать и как это фиксить.',
    outcomes: [
      'Поймёте, почему ответ зависит от контекста, а не от удачной фразы.',
      'Перестанете искать секретный промпт: его просто нет.',
      'Научитесь объяснять задачу так, чтобы ИИ понял с первого раза.',
    ],
    bridgeTitle: 'Хороший промпт помогает всего один раз',
    bridgeText: 'Если каждый раз заново рассказывать про проект, качество будет зависеть от удачи. Научим настраивать контекст и правила.',
    ctaLabel: 'Как правильно настроить проект?',
    seoTitle: 'Промпт-инжиниринг простым языком: как объяснить задачу ИИ — GELATO',
    seoDescription: 'Бесплатный урок по промпт-инжинирингу: почему секретного промпта не существует, что на самом деле решает контекст и как объяснить задачу ИИ с первого раза.',
    faq: [
      { question: 'Нужен ли специальный шаблон промпта?', answer: 'Нет. Структура помогает, но важнее полнота контекста, ограничения и понятный критерий результата.' },
      { question: 'Можно ли ставить задачи голосом?', answer: 'Да. Голос часто помогает быстрее передать детали, но задачу всё равно стоит проверить на конкретность.' },
      { question: 'Почему у опытных пользователей работают короткие промпты?', answer: 'У них контекст вынесен в правила проекта, скиллы и агентов. Короткий промпт — результат настройки, а не стартовая точка.' },
    ],
  },
  3: {
    lessonId: '03',
    h1: 'Почему лимиты уходят впустую',
    lead: 'Посмотрим, что на самом деле съедает ваши лимиты и как сделать так, чтобы ИИ не лопатила все подряд без разбора.',
    outcomes: [
      'Увидите, куда на самом деле уходят ваши лимиты.',
      'Поймёте, почему из-за размытой задачи ИИ перерывает лишнее.',
      'Начнёте сокращать не слова в промпте, а лишнюю работу.',
    ],
    bridgeTitle: 'Лимиты экономит контекст',
    bridgeText: 'Нужно понимать, что хранить в CLAUDE.md, что вынести в rules и skills, когда использовать память и как ограничивать область задачи.',
    ctaLabel: 'Посмотреть систему работы с контекстом',
    seoTitle: 'Куда уходят лимиты ИИ и как их экономить — GELATO',
    seoDescription: 'Бесплатный урок про токены и лимиты: что на самом деле съедает лимит в любом ИИ-инструменте, почему размытая задача дороже длинного промпта и как сократить лишнюю работу модели.',
    faq: [
      { question: 'Нужно ли делать промпты максимально короткими?', answer: 'Нет. Полезные детали обычно дешевле, чем лишний поиск и переделки из-за неясной задачи.' },
      { question: 'Стоит ли хранить все правила в CLAUDE.md?', answer: 'Нет. В основном файле лучше оставлять только постоянно нужный контекст, а специальные инструкции выносить в rules и skills.' },
      { question: 'Почему длинный чат расходует лимиты быстрее?', answer: 'Модель не помнит переписку, а перечитывает её заново на каждый запрос. Чем длиннее чат, тем дороже каждое следующее сообщение.' },
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
    seoTitle: 'Почему ИИ выдумывает ответы и как это починить — GELATO',
    seoDescription: 'Бесплатный урок про галлюцинации ИИ: откуда они берутся, как разрешить модели честно сказать «не знаю» и какие проверки делают её ответы надёжными.',
    faq: [
      { question: 'Можно ли полностью исключить галлюцинации?', answer: 'Нет, но можно заметно снизить их вероятность и не пропускать ошибки с помощью ограничений и автоматических проверок.' },
      { question: 'Зачем нужны отдельные агенты?', answer: 'Узкая роль уменьшает неоднозначность: агент получает только подходящие инструкции, контекст и критерии проверки.' },
    ],
  },
  // Роли вместо пустого промпта на примере gstack (github.com/garrytan/gstack)
  5: {
    lessonId: '05',
    h1: 'Роли вместо пустого промпта',
    lead: 'Разберём на примере gstack — бесплатного набора команд для Claude Code, — как вместо пустого окна чата позвать нужного «специалиста»: того, кто задаёт неудобные вопросы о вашей идее, ищет ошибки в коде или сам проверяет сайт в браузере.',
    outcomes: [
      'Поймёте, почему с ролью ИИ отвечает точнее, чем на пустой промпт: роль сразу говорит, что делать и как проверять результат.',
      'Увидите, как устроены роли gstack: /office-hours спорит с идеей до начала работы, /review ищет ошибки в коде, /qa проверяет сайт в браузере.',
      'Выстроите работу по шагам: подумать, спланировать, сделать, проверить — и каждый шаг передаёт результат следующему.',
    ],
    bridgeTitle: 'Роль — это настройка, которую не нужно объяснять заново',
    bridgeText: 'В gstack каждая команда — готовая инструкция: кто вы, что проверяете и чем заканчиваете. В обучениях GELATO вы собираете такие роли под свой проект, чтобы короткая команда каждый раз давала предсказуемый результат.',
    ctaLabel: 'Посмотреть, как собрать свои роли',
    seoTitle: 'Роли вместо пустого промпта: команды gstack для Claude Code — GELATO',
    seoDescription: 'Бесплатный урок о ролях для ИИ на примере gstack: что делают /office-hours, /review и /qa, почему роль даёт результат лучше пустого промпта и как выстроить работу по шагам.',
    faq: [
      { question: 'Что такое gstack?', answer: 'Бесплатный открытый набор команд для Claude Code от Гарри Тана, президента Y Combinator. Каждая команда — отдельная роль: основатель, дизайнер, проверяющий код, тестировщик. Это обычные текстовые инструкции, их можно прочитать и поменять под себя.' },
      { question: 'Нужно ли уметь программировать?', answer: 'Нет. Начать можно с /office-hours: вы рассказываете идею, а ИИ задаёт 6 вопросов, спорит с формулировкой и пишет короткий план. Это полезно ещё до первой строчки кода.' },
      { question: 'С чего начать?', answer: 'С трёх команд: /office-hours — описать задумку, /review — найти ошибки в изменениях, /qa — проверить сайт в браузере. Если этого хватает, дальше можно не идти.' },
      { question: 'Можно ли так работать без gstack?', answer: 'Да. Роль — это просто подробная инструкция для ИИ. Её можно написать самому и сохранить как скилл, чтобы вызывать одной короткой командой.' },
    ],
  },
};

export function getFreeLessonContent(courseSlug: string, lessonNumber: number): FreeLessonContent | null {
  return courseSlug === COURSE_SLUG ? LESSONS[lessonNumber] ?? null : null;
}

export function getLessonSeoContent(courseSlug: string, lessonNumber: number): LessonSeoContent | null {
  if (courseSlug === AGENTS_INTRO_LESSON.courseSlug && lessonNumber === AGENTS_INTRO_LESSON.number) {
    return AGENTS_INTRO_LESSON;
  }
  return getFreeLessonContent(courseSlug, lessonNumber);
}

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function buildProgramUrl(
  lesson: FreeLessonContent,
  searchParams: Record<string, SearchValue> = {},
): string {
  const url = new URL(PROGRAM_URL, SITE_URL);
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

  return `${url.pathname}${url.search}`;
}

export function isoDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds < 1) return undefined;
  const whole = Math.round(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${secs || (!hours && !minutes) ? `${secs}S` : ''}`;
}
