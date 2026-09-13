import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { freeLessonCards, trainingCourses } from '@/lib/catalog';
import { getCourseLanding } from '@/lib/course-landings';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL, TELEGRAM_CHANNEL } from '@/lib/site';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';

// llms.txt — короткая карта сайта для ИИ-поиска: ассистент читает её вместо
// того, чтобы гадать по вёрстке, и точнее пересказывает, чему тут учат.
// Данные берём из Firestore, поэтому только на запросе.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const courses = await getPublishedCoursesWithLessons();

  const lines: string[] = [
    '# GELATO',
    '',
    '> Школа осмысленной работы с ИИ на русском языке. Учим не «нажимать кнопки в нейросети», ',
    '> а работать системно: объяснять задачу словами, держать контекст, проверять результат ',
    '> и собирать своих ИИ-агентов. Бесплатные уроки открыты без регистрации, платные обучения ',
    '> идут с личной проверкой работ.',
    '',
    '## Бесплатные уроки о принципах работы с ИИ',
    '',
    'Общие принципы, не привязанные к конкретному инструменту: работают в Claude, ChatGPT, Gemini.',
    '',
  ];

  for (const lesson of freeLessonCards(courses)) {
    lines.push(`- [${lesson.title}](${SITE_URL}${lessonPath(lesson.courseKey, lesson.number)}): ${lesson.description}`);
  }

  lines.push('', '## Статьи', '');

  for (const post of BLOG_POSTS) {
    lines.push(`- [${post.title}](${blogPostUrl(post.slug)}): ${post.lead}`);
  }

  lines.push('', '## Обучения', '');

  for (const course of trainingCourses(courses)) {
    const key = courseKey(course);
    const landing = getCourseLanding(key);
    const note = landing?.seoDescription || course.description || '';
    lines.push(`- [${course.title}](${SITE_URL}/courses/${key}): ${note}`);
  }

  lines.push(
    '',
    '## Разделы',
    '',
    `- [Главная](${SITE_URL}/): о школе, преподавателе и подходе`,
    `- [Бесплатные материалы](${SITE_URL}/free): открытые уроки про принципы работы с ИИ`,
    `- [Наши обучения](${SITE_URL}/courses): каталог программ`,
    `- [Вопрос-ответ](${SITE_URL}/faq): кому подойдёт, как проходит, сколько стоит, возврат`,
    `- [Блог](${SITE_URL}/blog): разборы про работу с ИИ текстом`,
    `- [Телеграм](${TELEGRAM_CHANNEL}): анонсы и разборы`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
