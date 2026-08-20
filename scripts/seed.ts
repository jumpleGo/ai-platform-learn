// Сид-скрипт: наполняет Firestore тестовыми курсами и уроками.
// Запуск: npx tsx scripts/seed.ts (env берётся из .env.local)
// admin.ts не импортируем из-за 'server-only' — инициализация продублирована намеренно.
process.loadEnvFile('.env.local');

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Access, Course, Lesson } from '../src/lib/types';

function createApp(): App {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
  return initializeApp({
    credential: cert(JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString()
    )),
  });
}

const db = getFirestore(getApps()[0] ?? createApp());

// Разные форматы YouTube-ссылок для проверки нормализации (по кругу)
const VIDEO_URLS = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
];

// Демо-материалы: показывают заголовки, списки, ссылки, выноску и горячие клавиши
const SAMPLE_MATERIALS = `## Что разберём
- Главная идея урока с **акцентом** на практике
- Полезная ссылка: [документация Claude Code](https://docs.claude.com/claude-code)
- Запуск команды — нажмите Cmd+Enter, отмена — Esc

## Шаги
1. Откройте проект и панель Claude Code
2. Напишите задачу простыми словами
3. Примите изменения через \`Ctrl+Shift+Enter\`

> Совет: держите задачи маленькими — так модель ошибается реже.`;

type CourseSeed = {
  id: string;
  data: Omit<Course, 'id'>;
  lessonTitles: string[];
  lessonAccess: (index: number) => Access;
};

const COURSES: CourseSeed[] = [
  {
    id: 'course-basics',
    data: {
      slug: 'osnovy-platformy',
      title: 'Основы платформы',
      description: 'Вводный курс для знакомства с платформой. Разберём интерфейс, навигацию и базовые сценарии работы.',
      coverUrl: null,
      order: 0,
      published: true,
      access: 'free',
      isTest: false,
      testToastMessage: null,
      testLandingHtml: null,
      showBadge: false,
      badgeText: null,
      highlightBackground: false,
      clickCount: 0,
    },
    lessonTitles: [
      'Знакомство с платформой',
      'Навигация по каталогу',
      'Профиль и настройки',
      'Как проходить уроки',
    ],
    lessonAccess: () => 'free',
  },
  {
    id: 'course-advanced',
    data: {
      slug: 'prodvinutyy-kurs',
      title: 'Продвинутый курс',
      description: 'Углублённый курс для тех, кто освоил основы. Продвинутые техники, разбор реальных кейсов и практика.',
      coverUrl: null,
      order: 1,
      published: true,
      access: 'paid',
      isTest: false,
      testToastMessage: null,
      testLandingHtml: null,
      showBadge: false,
      badgeText: null,
      highlightBackground: false,
      clickCount: 0,
    },
    lessonTitles: [
      'Введение в продвинутые техники',
      'Работа с реальными кейсами',
      'Оптимизация рабочего процесса',
      'Итоговый практикум',
    ],
    lessonAccess: (i) => (i === 0 ? 'free' : 'paid'),
  },
];

async function main() {
  for (const course of COURSES) {
    const courseRef = db.doc(`courses/${course.id}`);
    await courseRef.set(course.data);
    for (let i = 0; i < course.lessonTitles.length; i++) {
      const lesson: Omit<Lesson, 'id' | 'courseId'> = {
        title: course.lessonTitles[i],
        description: `Урок «${course.lessonTitles[i]}» курса «${course.data.title}». Смотрите видео и закрепляйте материал на практике.`,
        videoEmbedUrl: VIDEO_URLS[i % VIDEO_URLS.length],
        durationSec: 300,
        order: i,
        access: course.lessonAccess(i),
        materials: SAMPLE_MATERIALS,
        views: 120 + i * 37 + course.data.order * 210,
        previewImageUrl: null,
      };
      await courseRef.collection('lessons').doc(`lesson-${i + 1}`).set(lesson);
    }
    console.log(`Seeded ${course.id} (${course.lessonTitles.length} lessons)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
