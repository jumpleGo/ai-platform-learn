import type { MetadataRoute } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { freeLessonCards, trainingCourses } from '@/lib/catalog';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';

// Карта строится по данным Firestore, а доступа к базе на сборке нет
// (креды приходят из .env на сервере), поэтому генерируем на запросе.
// Сами данные каталога кэшируются на 5 минут в getPublishedCoursesWithLessons.
export const dynamic = 'force-dynamic';

// Карта публичного сайта: витрины, лендинги обучений и бесплатные уроки.
// Личный кабинет, админка и юр. документы в индекс не идут.
// lastModified проставляем только у статей блога, где дата настоящая: фальшивая
// дата «время запроса» у остальных URL заставляла Google игнорировать поле целиком.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getPublishedCoursesWithLessons();

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/courses`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/free`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/reviews`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  // статьи блога живут в коде — дату берём из самой статьи
  const posts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: blogPostUrl(post.slug),
    lastModified: new Date(post.updated),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const landings: MetadataRoute.Sitemap = trainingCourses(courses).map((course) => ({
    url: `${SITE_URL}/courses/${courseKey(course)}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const lessons: MetadataRoute.Sitemap = freeLessonCards(courses).map((lesson) => ({
    url: `${SITE_URL}${lessonPath(lesson.courseKey, lesson.number)}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...statics, ...posts, ...landings, ...lessons];
}
