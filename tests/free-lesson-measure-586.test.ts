import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SITE_URL, standaloneFreeLessonPath } from '@/lib/free-lessons';
import StandaloneFreeLessonPage, {
  generateMetadata, generateStaticParams,
} from '@/app/(app)/free/[slug]/page';
import FreePage from '@/app/(app)/free/page';
import sitemap from '@/app/sitemap';
import { GET as getLlms } from '@/app/llms.txt/route';

// Как в #583: пустой каталог, без обращения к Firestore и без входа.
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/reels-availability', () => ({ hasPublishedReels: async () => false }));

const SLUG = 'sam-i-ii';
const PATH = standaloneFreeLessonPath(SLUG);

// Самостоятельные уроки в исходной копии 62b46b8 до #586.
// Минимальная фикстура: только замороженный список, без чтения истории.
const OLD_SLUGS = Object.freeze(['gstack-praktikum', 'proverka-otvetov-ii']);

function checkDiscovery(paths: readonly string[]) {
  expect(paths).toContain(PATH);
  expect(paths.filter((path) => path === PATH)).toHaveLength(1);
}

describe('бесплатный практикум замера пользы ИИ #586', () => {
  it('отдаёт бесплатную страницу с таблицей, вопросом и canonical', async () => {
    const props = { params: Promise.resolve({ slug: SLUG }) };
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata(props);
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${PATH}`);

    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(props)).replaceAll('\u00a0', ' ');
    expect(html).toContain('Сделай знакомую задачу сам и с ИИ');
    expect(html).toContain('"isAccessibleForFree":true');
    expect(html).toContain('<table');
    for (const label of ['Время, мин', 'Ошибок до исправления', 'Оценка итога, 1–5']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Вопрос на понимание');
  });

  it('есть в списке /free даже при пустом каталоге курсов', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    const catalogPaths = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    checkDiscovery(catalogPaths);
    for (const slug of OLD_SLUGS) expect(catalogPaths).toContain(standaloneFreeLessonPath(slug));
  });

  it('есть в sitemap даже при пустом каталоге курсов', async () => {
    const sitemapPaths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    checkDiscovery(sitemapPaths);
    for (const slug of OLD_SLUGS) expect(sitemapPaths).toContain(standaloneFreeLessonPath(slug));
  });

  it('добавляет практикум в llms.txt', async () => {
    const text = await (await getLlms()).text();
    expect(text).toContain(`](${SITE_URL}${PATH}):`);
  });

  it('те же проверки каталога и sitemap отклоняют старый список', () => {
    const oldPaths = OLD_SLUGS.map(standaloneFreeLessonPath);
    let oldFails = 0;
    for (const surface of ['catalog', 'sitemap']) {
      expect(() => checkDiscovery(oldPaths), surface).toThrow(PATH);
      oldFails++;
    }
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(2);
  });
});
