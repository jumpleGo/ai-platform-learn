import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SITE_URL } from '@/lib/free-lessons';
import StandaloneFreeLessonPage, {
  generateMetadata, generateStaticParams,
} from '@/app/(app)/free/[slug]/page';
import FreePage from '@/app/(app)/free/page';
import sitemap from '@/app/sitemap';
import { GET as getLlms } from '@/app/llms.txt/route';

// Практикум доступен без записи курса и без входа.
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/reels-availability', () => ({ hasPublishedReels: async () => false }));

const SLUG = 'proverka-otvetov-ii';
const PATH = `/free/${SLUG}`;

// Только самостоятельные адреса при пустой БД, зафиксированные до #583.
// Их источник — общий список в src/lib/free-lessons.ts. Полные файлы не копируем.
// Происхождение записано здесь; тест не обращается к истории репозитория.
const OLD_DISCOVERY = Object.freeze({
  commit: '4be12c11867308b215792b67b70771cee1fbf51c',
  sourceSha256: '9d409290d1e568e35b7a9ed86ef8ba83e37f265820e1e9925c6591bd475f20ce',
  catalogPaths: Object.freeze(['/free/gstack-praktikum']),
  sitemapPaths: Object.freeze(['/free/gstack-praktikum']),
});

type Discovery = { catalogPaths: readonly string[]; sitemapPaths: readonly string[] };

function discoveryChecks(discovery: Discovery) {
  return [
    () => expect(discovery.catalogPaths).toContain(PATH),
    () => expect(discovery.sitemapPaths).toContain(PATH),
  ];
}

describe('бесплатный практикум проверки ответов ИИ #583', () => {
  it('отдаёт страницу с метаданными, источниками и бесплатным учебным материалом', async () => {
    const props = { params: Promise.resolve({ slug: SLUG }) };
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata(props);
    expect(metadata.title).toBe('Как проверить ответ ИИ: бесплатный практикум — GELATO');
    expect(metadata.description).toContain('потерянную строку');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${PATH}`);

    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(props));
    expect(html.replaceAll('\u00a0', ' ')).toContain('Как проверить, что ИИ не ошибся');
    expect(html).toContain('"isAccessibleForFree":true');
    for (const id of ['2610.33509', '2611.00442', '2611.00491']) {
      expect(html).toContain(`href="https://arxiv.org/html/${id}v1#`);
    }
  });

  it('есть в списке /free и sitemap даже без уроков в БД', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    const catalogPaths = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    const sitemapPaths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    for (const check of discoveryChecks({ catalogPaths, sitemapPaths })) check();
    expect(catalogPaths.filter((path) => path === PATH)).toHaveLength(1);
    expect(sitemapPaths.filter((path) => path === PATH)).toHaveLength(1);
    expect(catalogPaths).toContain('/free/gstack-praktikum');
    expect(sitemapPaths).toContain('/free/gstack-praktikum');
  });

  it('добавляет новый практикум и #572 в llms.txt', async () => {
    const response = await getLlms();
    const text = await response.text();
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(text).toContain(`](${SITE_URL}${PATH}):`);
    expect(text).toContain(`](${SITE_URL}/free/gstack-praktikum):`);
  });

  it('те же проверки падают на минимальных списках до изменения', () => {
    let oldFails = 0;
    for (const check of discoveryChecks(OLD_DISCOVERY)) {
      expect(check).toThrow(PATH);
      oldFails++;
    }
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(2);
  });
});
