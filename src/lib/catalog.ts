// Разбор каталога на две витрины: бесплатные материалы и обучения.
// Чистые функции над данными Firestore — используются главной, /free и /courses.

import type { CourseWithLessons } from '@/lib/db/courses';
import { courseKey } from '@/lib/slug';
import { isFreeHub } from '@/lib/site';
import { plural } from '@/lib/utils';
import { nbsp } from '@/lib/typography';
import { getFreeLessonContent } from '@/lib/free-lessons';

export type FreeLessonCard = {
  key: string;
  courseKey: string;
  courseTitle: string;
  number: number;
  title: string;
  description: string;
  previewImageUrl: string | null;
  durationSec: number | null;
  views: number;
};

// Бесплатные уроки только из курса-хаба: это и есть витрина полезных материалов.
// Уроки с пометкой free в обучениях сюда не попадают — они часть платной программы.
export function freeLessonCards(courses: readonly CourseWithLessons[]): FreeLessonCard[] {
  const hub = courses.filter((c) => !c.isTest && isFreeHub(c));
  return hub.flatMap((course) =>
    course.lessons
      .filter((lesson) => lesson.access === 'free')
      .map((lesson) => {
        const { number } = lesson;
        // у уроков воронки есть редакторский заголовок и лид — на витрине они цепляют
        // сильнее служебных названий из админки
        const funnel = getFreeLessonContent(courseKey(course), number);
        return {
          key: `${course.id}:${lesson.id}`,
          courseKey: courseKey(course),
          courseTitle: course.title,
          number,
          title: nbsp(funnel?.h1 ?? lesson.title),
          description: nbsp(funnel?.lead ?? lesson.description),
          previewImageUrl: lesson.previewImageUrl,
          durationSec: lesson.durationSec,
          views: lesson.views ?? 0,
        };
      }),
  );
}

// Витрина «Наши обучения»: всё, кроме курса-хаба бесплатных материалов.
export function trainingCourses(courses: readonly CourseWithLessons[]): CourseWithLessons[] {
  return courses.filter((c) => !isFreeHub(c));
}

// Подпись под обложкой обучения: сколько уроков и в каком статусе курс
export function courseMeta(course: CourseWithLessons): string {
  const n = course.lessons.length;
  const lessons = `${n} ${plural(n, ['урок', 'урока', 'уроков'])}`;
  return course.isTest ? `${lessons} · предзапись` : lessons;
}
