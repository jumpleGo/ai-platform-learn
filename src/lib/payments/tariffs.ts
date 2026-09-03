export interface Tariff {
  id: string;
  title: string;
  description: string;
  price: number; // в рублях
  oldPrice?: number;
  periodDays: number;
  months: number;
  popular?: boolean;
  hasSupport?: boolean;
  startDate?: string;
  features: string[];
  excludedFeatures?: string[];
  specialOffer?: {
    label: string;
    title: string;
    note: string;
  };
}

export interface CoursePaymentConfig {
  courseSlug: string;
  courseTitle: string;
  subtitle?: string;
  tariffs: Tariff[];
}

// Дефолтные общие тарифы
export const DEFAULT_TARIFFS: Tariff[] = [
  {
    id: 'month',
    title: '1 месяц',
    description: 'Полный доступ ко всем урокам и материалам на 30 дней',
    price: 1990,
    oldPrice: 2790,
    periodDays: 30,
    months: 1,
    hasSupport: false,
    features: [
      'Доступ ко всем платным курсам',
      'Исходники, шаблоны и правила для ИИ',
      'Доступ к новым урокам в течение месяца',
    ],
  },
  {
    id: '3months',
    title: '3 месяца',
    description: 'Оптимальный вариант для прохождения всех программ',
    price: 4990,
    oldPrice: 6990,
    periodDays: 90,
    months: 3,
    popular: true,
    hasSupport: false,
    features: [
      'Доступ ко всем платным курсам',
      'Исходники, шаблоны и правила для ИИ',
      'Все обновления и новые программы',
      'Экономия 44%',
    ],
  },
  {
    id: 'year',
    title: '1 год',
    description: 'Максимальная выгода и доступ ко всем курсам платформы',
    price: 9990,
    oldPrice: 13990,
    periodDays: 365,
    months: 12,
    hasSupport: false,
    features: [
      '365 дней безлимитного доступа',
      'Все текущие и будущие курсы',
      'Приоритетный разбор вопросов',
      'Экономия 58%',
    ],
  },
];

export const TARIFFS = DEFAULT_TARIFFS;

const VIBECODING_PAYMENT_CONFIG: CoursePaymentConfig = {
  courseSlug: 'it-vibecoding',
  courseTitle: 'ИИ для вайбкодеров и программистов (Инженерный вайбкодинг)',
  subtitle: 'Старт потока 14 сентября · Типы, тесты, линтер, CLAUDE.md и агент-ревьюер для вашего проекта',
  tariffs: [
    {
      id: 'vibecoding_month',
      title: 'Самостоятельно',
      description: 'Вся программа курса для самостоятельного прохождения',
      price: 7900,
      oldPrice: 10900,
      periodDays: 60,
      months: 2,
      hasSupport: false,
      features: [
        'Все 5 этапов и 17 уроков программы',
        'Шаблоны CLAUDE.md, rules и линтеров',
        'Доступ ко всем материалам на 2 месяца',
      ],
      excludedFeatures: ['Без сопровождения'],
    },
    {
      id: 'vibecoding_stream',
      title: 'С поддержкой Эмиля',
      description: 'Старт 14 сентября: курс с личным разбором вашего репозитория и поддержкой',
      price: 19900,
      oldPrice: 27900,
      periodDays: 60,
      months: 2,
      popular: true,
      hasSupport: true,
      startDate: '14 сентября',
      features: [
        'Старт потока 14 сентября',
        'Все 17 уроков и материалы программы',
        'Личный разбор вашего репозитория и кода',
        'Проверка домашних заданий текстом/голосом',
        '3 недели личной поддержки в чате Telegram',
      ],
      specialOffer: {
        label: 'Спецпредложение',
        title: 'Claude Pro на месяц в подарок',
        note: 'Оплачиваю Claude Pro на 1 месяц. Докупать ничего не нужно.',
      },
    },
  ],
};

// Кастомные тарифы и контент под каждый конкретный курс
export const COURSE_PAYMENT_CONFIGS: Record<string, CoursePaymentConfig> = {
  'it-vibecoding': VIBECODING_PAYMENT_CONFIG,
  vibecoding: VIBECODING_PAYMENT_CONFIG,
  'ai-cartoons': {
    courseSlug: 'ai-cartoons',
    courseTitle: 'Свой мультик за вечер (ИИ-мультфильмы)',
    subtitle: 'Claude, Nano Banana, Seedance и Gemini в одном пайплайне',
    tariffs: [
      {
        id: 'cartoons_month',
        title: '1 месяц',
        description: 'Доступ ко всем урокам и пайплайну генерации',
        price: 1990,
        oldPrice: 2790,
        periodDays: 30,
        months: 1,
        hasSupport: false,
        features: [
          '8 модулей от сценария до монтажа',
          'Шаблоны промптов и лист персонажа',
          'Доступ ко всем урокам на 30 дней',
        ],
      },
      {
        id: 'cartoons_stream',
        title: 'Поток по предзаписи (3 месяца)',
        description: 'Полный курс со скидкой и разбором ваших кадров',
        price: 4490,
        oldPrice: 6290,
        periodDays: 90,
        months: 3,
        popular: true,
        hasSupport: true,
        startDate: 'по предзаписи',
        features: [
          'Все модули пайплайна от идеи до ролика',
          'Личный разбор ваших кадров',
          'Форматы под YouTube и Reels',
          'Доступ на 3 месяца',
        ],
      },
      {
        id: 'cartoons_year',
        title: '1 год (Все курсы)',
        description: 'Годовой доступ ко всей платформе Gelato',
        price: 8990,
        oldPrice: 12490,
        periodDays: 365,
        months: 12,
        hasSupport: false,
        features: [
          '365 дней безлимитного доступа',
          'Все текущие и будущие программы',
          'Приоритетный разбор вопросов',
        ],
      },
    ],
  },
  'claude-code-agents': {
    courseSlug: 'claude-code-agents',
    courseTitle: 'Claude Code с нуля — свои ИИ-агенты',
    subtitle: 'Учитесь на своей идее и собираете команду агентов без программирования',
    tariffs: [
      {
        id: 'agents_month',
        title: 'Самостоятельно',
        description: 'Полная программа без сопровождения',
        price: 7990,
        oldPrice: 10990,
        periodDays: 60,
        months: 2,
        hasSupport: false,
        features: [
          'Все уроки и конспекты на платформе',
          'Шаблоны агентов, скиллы и MCP',
          'Доступ к платформе на 2 месяца',
        ],
        excludedFeatures: ['Поддержка не входит'],
      },
      {
        id: 'agents_stream',
        title: 'С поддержкой — 3 недели',
        description: 'Программа с личной поддержкой и проверкой заданий',
        price: 15990,
        oldPrice: 21990,
        periodDays: 60,
        months: 2,
        popular: true,
        hasSupport: true,
        startDate: '14 сентября',
        features: [
          'Все уроки и практика на вашем проекте',
          'Личная поддержка в течение 3 недель',
          'Разбор домашних заданий и вашего проекта',
        ],
        specialOffer: {
          label: 'Спецпредложение',
          title: 'Claude Pro — 1 месяц в подарок',
          note: 'Начнёте обучение сразу со всеми возможностями Claude Code',
        },
      },
      {
        id: 'agents_year',
        title: 'Расширенный — 4 недели',
        description: 'Продвинутая программа с личной поддержкой',
        price: 27990,
        oldPrice: 37990,
        periodDays: 60,
        months: 2,
        hasSupport: true,
        startDate: '14 сентября',
        features: [
          'Всё из тарифа с поддержкой',
          'Мультиагентная система и оркестрация',
          'Личная поддержка в течение 4 недель',
        ],
        specialOffer: {
          label: 'Спецпредложение',
          title: 'Claude Pro — 1 месяц в подарок',
          note: 'Начнёте обучение сразу со всеми возможностями Claude Code',
        },
      },
    ],
  },
};

import { VIBE_STREAM_REGULAR_PRICE } from '@/lib/payments/vibe-timer';

export function getTariffsForCourse(
  courseSlugOrId?: string,
  options?: { isVibeTimerExpired?: boolean; isTestRub?: boolean }
): Tariff[] {
  const baseList = !courseSlugOrId
    ? DEFAULT_TARIFFS
    : COURSE_PAYMENT_CONFIGS[courseSlugOrId]?.tariffs || DEFAULT_TARIFFS;

  return baseList.map((t) => {
    let price = t.price;
    if (options?.isVibeTimerExpired && t.id === 'vibecoding_stream') {
      price = VIBE_STREAM_REGULAR_PRICE;
    }
    if (options?.isTestRub) {
      price = 1;
    }
    return price !== t.price ? { ...t, price } : t;
  });
}

export function getCoursePaymentConfig(courseSlugOrId?: string): CoursePaymentConfig | null {
  if (!courseSlugOrId) return null;
  return COURSE_PAYMENT_CONFIGS[courseSlugOrId] || null;
}

export function getTariffById(
  id: string,
  courseSlugOrId?: string,
  options?: { isVibeTimerExpired?: boolean; isTestRub?: boolean }
): Tariff | undefined {
  const list = getTariffsForCourse(courseSlugOrId, options);
  const found = list.find((t) => t.id === id);
  if (found || courseSlugOrId) return found;

  // Без контекста курса допускаем поиск по глобально уникальному id.
  for (const c of Object.values(COURSE_PAYMENT_CONFIGS)) {
    const t = c.tariffs.find((item) => item.id === id);
    if (t) {
      let price = t.price;
      if (options?.isVibeTimerExpired && t.id === 'vibecoding_stream') {
        price = VIBE_STREAM_REGULAR_PRICE;
      }
      if (options?.isTestRub) {
        price = 1;
      }
      return price !== t.price ? { ...t, price } : t;
    }
  }
  return undefined;
}

export function getDefaultTariff(
  courseSlugOrId?: string,
  options?: { isVibeTimerExpired?: boolean; isTestRub?: boolean }
): Tariff {
  const list = getTariffsForCourse(courseSlugOrId, options);
  return list.find((t) => t.popular) || list[0] || DEFAULT_TARIFFS[0];
}
