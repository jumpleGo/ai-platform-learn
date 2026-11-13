import { getCourseLanding } from '@/lib/course-landings';
import { AGENTS_INTRO_LESSON } from '@/lib/free-lessons';
import { COURSE_PAYMENT_CONFIGS } from '@/lib/payments/tariffs';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { lessonPath } from '@/lib/slug';

// Только редакторские описания и тарифы с публичных страниц. Без Firestore,
// сессии и закрытых материалов; текст можно собрать без ключа Firebase.
export const dynamic = 'force-static';

export function GET(): Response {
  const lines = [
    '# GELATO — обучение работе с ИИ',
    '',
    'Школа на русском языке. Начать можно с бесплатного вводного урока без опыта программирования.',
    '',
    '## Бесплатный вводный урок',
    '',
    `- [${AGENTS_INTRO_LESSON.h1}](${SITE_URL}${lessonPath(AGENTS_INTRO_LESSON.courseSlug, AGENTS_INTRO_LESSON.number)}): ${AGENTS_INTRO_LESSON.seoDescription}`,
    '',
    'Бесплатно доступен этот отдельный вводный урок. Полные программы ниже платные.',
    '',
    '## Платные программы',
    '',
  ];

  for (const [slug, config] of Object.entries(COURSE_PAYMENT_CONFIGS)) {
    const landing = getCourseLanding(slug);
    if (!landing) continue;
    const prices = config.tariffs.map((tariff) => tariff.price).filter((price) => Number.isFinite(price) && price > 0);
    lines.push(`- [${config.courseTitle}](${SITE_URL}/courses/${slug}): ${landing.seoDescription}`);
    if (prices.length) {
      const low = Math.min(...prices).toLocaleString('ru-RU');
      const high = Math.max(...prices).toLocaleString('ru-RU');
      lines.push(`  Стоимость: ${low === high ? low : `${low}–${high}`} ₽, в зависимости от тарифа.`);
    }
    lines.push('');
  }

  lines.push('## Блог', '');

  for (const post of BLOG_POSTS) {
    lines.push(`- [${post.title}](${blogPostUrl(post.slug)}): ${post.lead}`);
  }

  lines.push('');

  lines.push(
    '## Другие публичные материалы',
    '',
    `- [Бесплатные материалы](${SITE_URL}/free): открытые уроки о том, как объяснять задачу ИИ и проверять ответ.`,
    `- [Вопрос-ответ](${SITE_URL}/faq): кому подойдёт обучение и как оно проходит.`,
    `- [Краткая карта сайта](${SITE_URL}/llms.txt): ссылки на уроки, статьи и разделы.`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
