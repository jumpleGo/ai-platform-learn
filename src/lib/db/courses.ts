import 'server-only';
import { cache } from 'react';
import { unstable_cache, revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import type { Course, Lesson } from '@/lib/types';
import { parseLessonNumber } from '@/lib/slug';

export type CourseWithLessons = Course & { lessons: Lesson[] };

export const getPublishedCoursesWithLessons = unstable_cache(
  async (): Promise<CourseWithLessons[]> => {
    // только equality-фильтр (single-field index), сортировка по order — в памяти:
    // так запрос не требует составного индекса Firestore
    const snap = await adminDb.collection('courses').where('published', '==', true).get();
    const courses = await Promise.all(snap.docs.map(async (d) => {
      const lessons = await d.ref.collection('lessons').orderBy('order').get();
      return {
        id: d.id, ...(d.data() as Omit<Course, 'id'>),
        lessons: lessons.docs.map((l) => ({ id: l.id, courseId: d.id, ...(l.data() as Omit<Lesson, 'id' | 'courseId'>) })),
      };
    }));
    return courses.sort((a, b) => a.order - b.order);
  },
  ['catalog'],
  { tags: ['catalog'], revalidate: 300 },
);

// Курс по ключу из URL: сначала по slug, затем — по id документа (старые ссылки с хешами
// продолжают работать, страница делает с них редирект на человекочитаемый адрес)
async function findCourse(key: string): Promise<Course | null> {
  const bySlug = await adminDb.collection('courses').where('slug', '==', key).limit(1).get();
  if (bySlug.empty && !/^[\w-]+$/.test(key)) return null; // мусор в пути не отдаём в Firestore
  const doc = bySlug.empty ? await adminDb.doc(`courses/${key}`).get() : bySlug.docs[0];
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Course, 'id'>) };
}

export type ResolvedLesson = {
  course: Course;
  lesson: Lesson;
  // Порядковый номер урока в курсе (1, 2, 3…) — он же сегмент URL
  number: number;
  // Дата создания записи на платформе — используется как дата публикации в structured data.
  publishedAt: string;
};

// Урок по ключу курса и ключу урока из URL. Ключ урока — номер (1, 2, …) или,
// для старых ссылок, id документа.
export const resolveLesson = cache(async function resolveLesson(
  courseKeyParam: string,
  lessonKeyParam: string,
): Promise<ResolvedLesson | null> {
  const course = await findCourse(courseKeyParam);
  if (!course) return null;
  // черновик не доступен по прямому URL — страница отдаст notFound
  if (!course.published) return null;

  const snap = await adminDb.collection(`courses/${course.id}/lessons`).orderBy('order').get();
  const number = parseLessonNumber(lessonKeyParam);
  const index = number !== null
    ? number - 1
    : snap.docs.findIndex((d) => d.id === lessonKeyParam);
  const doc = index >= 0 ? snap.docs[index] : undefined;
  if (!doc) return null;

  return {
    course,
    lesson: { id: doc.id, courseId: course.id, ...(doc.data() as Omit<Lesson, 'id' | 'courseId'>) },
    number: index + 1,
    publishedAt: doc.createTime.toDate().toISOString(),
  };
});

export async function getLesson(courseId: string, lessonId: string): Promise<{ course: Course; lesson: Lesson } | null> {
  const courseSnap = await adminDb.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) return null;
  if (!(courseSnap.data() as { published?: boolean }).published) return null;
  const lessonSnap = await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).get();
  if (!lessonSnap.exists) return null;
  return {
    course: { id: courseSnap.id, ...(courseSnap.data() as Omit<Course, 'id'>) },
    lesson: { id: lessonSnap.id, courseId, ...(lessonSnap.data() as Omit<Lesson, 'id' | 'courseId'>) },
  };
}

// Курс-пустышка для лендинга предзаписи /waitlist/[courseSlug]. Без кэша — это редко
// посещаемый маркетинговый роут, свежесть важнее.
export async function getTestCourse(key: string): Promise<Course | null> {
  const course = await findCourse(key);
  if (!course || !course.isTest) return null;
  return course;
}

export function invalidateCatalog() {
  // в Next 16 revalidateTag требует профиль; 'max' = пометить устаревшим, отдавая старое до фоновой ревалидации (SWR)
  revalidateTag('catalog', 'max');
}
