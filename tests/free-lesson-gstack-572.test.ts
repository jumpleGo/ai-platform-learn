import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  AGENTS_INTRO_LESSON, SITE_URL, STANDALONE_FREE_LESSONS,
  getLessonSeoContent, getStandaloneFreeLesson, standaloneFreeLessonPath,
} from '@/lib/free-lessons';
import { lessonPath } from '@/lib/slug';
import StandaloneFreeLessonPage, {
  generateMetadata, generateStaticParams,
} from '@/app/(app)/free/[slug]/page';
import FreePage from '@/app/(app)/free/page';
import sitemap from '@/app/sitemap';

// Каталог проверяем с пустой БД: самостоятельный урок не требует записи курса.
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const NEW_SLUG = 'gstack-praktikum';
const README = 'https://github.com/garrytan/gstack/blob/3b650356f3d711caca98713475dd6085b15c5996/README.md';

// Минимальная замороженная фикстура из main: только слаги и происхождение.
// src/lib/free-lessons.ts прочитан при подготовке; git и origin в тесте не нужны.
const MAIN_FREE_LESSONS = Object.freeze({
  commit: '56c7582e2f01ee37eb47222956c2a1bab47b27c1',
  sourceSha256: 'e49c11378792d28b8e6e63750acba3c19c5b1d79636076bd2fbd837a2b9fd5de',
  slugs: Object.freeze([
    'claude-code/lessons/1',
    'claude-code/lessons/2',
    'claude-code/lessons/3',
    'claude-code/lessons/4',
    'claude-code/lessons/5',
    'claude-code-agents/lessons/1',
  ]),
});

function hasPracticum(slugs: readonly string[]): boolean {
  return slugs.includes(NEW_SLUG);
}

function pageProps(slug = NEW_SLUG) {
  return { params: Promise.resolve({ slug }) };
}

describe('самостоятельный бесплатный практикум gstack #572', () => {
  it('есть в опубликованном списке и имеет отдельный адрес', () => {
    const published = STANDALONE_FREE_LESSONS.filter((lesson) => lesson.published);
    expect(hasPracticum(published.map((lesson) => lesson.slug))).toBe(true);
    expect(published.filter((lesson) => lesson.slug === NEW_SLUG)).toHaveLength(1);
    expect(getStandaloneFreeLesson(NEW_SLUG)).toMatchObject({ slug: NEW_SLUG, published: true });
    expect(standaloneFreeLessonPath(NEW_SLUG)).toBe('/free/gstack-praktikum');
  });

  it('тот же критерий отклоняет замороженный список main без практикума', () => {
    expect(hasPracticum(MAIN_FREE_LESSONS.slugs)).toBe(false);
  });

  it('сохраняет каждый прежний адрес из main и вводный урок', () => {
    const currentSlugs = MAIN_FREE_LESSONS.slugs.flatMap((slug) => {
      const [courseSlug, lessonNumber] = slug.split('/lessons/');
      const number = Number(lessonNumber);
      return getLessonSeoContent(courseSlug, number)
        ? [lessonPath(courseSlug, number).slice('/courses/'.length)]
        : [];
    });
    expect(currentSlugs).toEqual(MAIN_FREE_LESSONS.slugs);
    expect(lessonPath(AGENTS_INTRO_LESSON.courseSlug, AGENTS_INTRO_LESSON.number))
      .toBe('/courses/claude-code-agents/lessons/1');
  });

  it('ссылается в самом тексте на README с заданным полным коммитом', () => {
    expect(getStandaloneFreeLesson(NEW_SLUG)?.body ?? '')
      .toContain(`[README gstack, коммит 3b650356f3d711caca98713475dd6085b15c5996](${README})`);
  });

  it('отдаёт параметры страницы и canonical нового адреса', async () => {
    expect(generateStaticParams()).toContainEqual({ slug: NEW_SLUG });
    const metadata = await generateMetadata(pageProps());
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/free/gstack-praktikum`);
  });

  it('показывает текст, команды, источник и бесплатный учебный материал', async () => {
    // Вызываем обработчик и рендерим уже разрешённое дерево, без Next-сервера.
    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(pageProps()));
    expect(html).toContain('<h1');
    expect(html).toContain(`href="${README}"`);
    expect(html).toContain('/office-hours');
    expect(html).toContain('/review');
    expect(html).toContain('/qa');
    expect(html).toContain('Введите название покупки');
    expect(html).toContain('"isAccessibleForFree":true');
  });

  it('доступен из /free и sitemap даже без уроков в БД', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    expect(html).toContain('href="/free/gstack-praktikum"');
    expect(html).not.toContain('Бесплатные уроки скоро появятся.');
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/free/gstack-praktikum`);
  });

  it('возвращает 404 для отсутствующего самостоятельного урока', async () => {
    expect(getStandaloneFreeLesson('missing-practicum')).toBeNull();
    await expect(StandaloneFreeLessonPage(pageProps('missing-practicum')))
      .rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(generateMetadata(pageProps('missing-practicum')))
      .rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
