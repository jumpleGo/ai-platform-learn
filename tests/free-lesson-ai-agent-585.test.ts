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

const SLUG = 'kak-ustroen-ii-agent';
const PATH = `/free/${SLUG}`;

// Самостоятельные адреса до #585. Тест не обращается к истории репозитория.
const OLD_DISCOVERY = Object.freeze({
  commit: '2af786d699bacd0c35742bfb31660a77e354b45c',
  sourceSha256: '27358df30eedd1c2cb894a70b9f7f2fdb564b4a2f506e182a5a74cb8b52d4c6a',
  catalogPaths: Object.freeze(['/free/gstack-praktikum', '/free/proverka-otvetov-ii']),
  sitemapPaths: Object.freeze(['/free/gstack-praktikum', '/free/proverka-otvetov-ii']),
});

type Discovery = { catalogPaths: readonly string[]; sitemapPaths: readonly string[] };

function discoveryChecks(discovery: Discovery) {
  return [
    () => expect(discovery.catalogPaths).toContain(PATH),
    () => expect(discovery.sitemapPaths).toContain(PATH),
  ];
}

describe('бесплатный практикум про ИИ-агента #585', () => {
  it('отдаёт страницу с метаданными, границей примера и источниками', async () => {
    const props = { params: Promise.resolve({ slug: SLUG }) };
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata(props);
    expect(metadata.title).toBe('Что такое ИИ-агент и чем он отличается от чата — бесплатный практикум — GELATO');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${PATH}`);

    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(props)).replaceAll(' ', ' ');
    expect(html).toContain('Как устроен ИИ-агент');
    expect(html).toContain('не управление всей игрой по картинке');
    expect(html).toContain('"isAccessibleForFree":true');
    expect(html).toContain('href="https://www.latent.space/p/aie-code"');
    expect(html).toContain('href="https://huggingface.co/sky7350/Mica-v0.5-4B"');
  });

  it('есть в списке /free и sitemap даже без уроков в БД', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    const catalogPaths = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    const sitemapPaths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    for (const check of discoveryChecks({ catalogPaths, sitemapPaths })) check();
    expect(catalogPaths.filter((path) => path === PATH)).toHaveLength(1);
    expect(sitemapPaths.filter((path) => path === PATH)).toHaveLength(1);
  });

  it('добавляет практикум в llms.txt', async () => {
    const text = await (await getLlms()).text();
    expect(text).toContain(`](${SITE_URL}${PATH}):`);
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
