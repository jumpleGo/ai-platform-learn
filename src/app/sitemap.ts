import type { MetadataRoute } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { freeLessonCards, trainingCourses } from '@/lib/catalog';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';

// Карта публичного сайта: витрины, лендинги обучений и бесплатные уроки.
// Личный кабинет, админка и юр. документы в индекс не идут.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getPublishedCoursesWithLessons();
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/free`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const landings: MetadataRoute.Sitemap = trainingCourses(courses).map((course) => ({
    url: `${SITE_URL}/courses/${courseKey(course)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const lessons: MetadataRoute.Sitemap = freeLessonCards(courses).map((lesson) => ({
    url: `${SITE_URL}${lessonPath(lesson.courseKey, lesson.number)}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...statics, ...landings, ...lessons];
}
