import type { MetadataRoute } from 'next';
import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
import { listPublishedReels } from '@/lib/db/reels';
import type { Reel } from '@/lib/reels';
import { trainingCourses } from '@/lib/catalog';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';
<<<<<<< HEAD
import { STANDALONE_FREE_LESSONS, standaloneFreeLessonPath } from '@/lib/free-lessons';
=======
import { listPublishedReels } from '@/lib/db/reels';
import { reelUrl } from '@/lib/reel-urls';
>>>>>>> 176b733 (feat(reels): add SEO pages and fullscreen mobile playback (#552))

// Карта строится по данным Firestore, а доступа к базе на сборке нет
// (креды приходят из .env на сервере), поэтому генерируем на запросе.
// Сами данные каталога кэшируются на 5 минут в getPublishedCoursesWithLessons.
export const dynamic = 'force-dynamic';

// Карта публичного сайта: витрины, лендинги обучений и бесплатные уроки.
// Личный кабинет, админка и юр. документы в индекс не идут.
// lastModified проставляем только у статей блога, где дата настоящая: фальшивая
// дата «время запроса» у остальных URL заставляла Google игнорировать поле целиком.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
<<<<<<< HEAD
  const [courses, publishedReels]: [CourseWithLessons[], Reel[]] = await Promise.all([
    getPublishedCoursesWithLessons(),
    listPublishedReels(),
  ]);
=======
  const [courses, reels] = await Promise.all([getPublishedCoursesWithLessons(), listPublishedReels()]);
>>>>>>> 176b733 (feat(reels): add SEO pages and fullscreen mobile playback (#552))

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/courses`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/free`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/reviews`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/reels`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/student`, changeFrequency: 'monthly', priority: 0.6 },
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

  // Каталог уже исключает неопубликованные уроки. Открытые уроки обучений
  // тоже индексируются; платные уроки и курсы предзаписи в карту не идут.
  const lessons: MetadataRoute.Sitemap = courses.filter((course) => !course.isTest).flatMap((course) =>
    course.lessons.filter((lesson) => lesson.access === 'free').map((lesson) => ({
      url: `${SITE_URL}${lessonPath(courseKey(course), lesson.number)}`,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  );

<<<<<<< HEAD
  const reels: MetadataRoute.Sitemap = publishedReels.map((reel) => ({
    url: `${SITE_URL}/reels/${reel.id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const standaloneLessons: MetadataRoute.Sitemap = STANDALONE_FREE_LESSONS
    .filter((lesson) => lesson.published)
    .map((lesson) => ({
      url: `${SITE_URL}${standaloneFreeLessonPath(lesson.slug)}`,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

  return [...statics, ...posts, ...landings, ...lessons, ...standaloneLessons, ...reels];
=======
  const reelPages: MetadataRoute.Sitemap = reels.map((reel) => ({
    url: reelUrl(reel.id), changeFrequency: 'weekly', priority: 0.6,
  }));

  return [...statics, ...posts, ...landings, ...lessons, ...reelPages];
>>>>>>> 176b733 (feat(reels): add SEO pages and fullscreen mobile playback (#552))
}
