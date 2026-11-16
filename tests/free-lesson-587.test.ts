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

const SLUG = 'chto-umeet-ii';
const PATH = `/free/${SLUG}`;

// Самостоятельные адреса до #587. Тест не обращается к истории репозитория.
const OLD_DISCOVERY = Object.freeze({
  commit: '4e0dc4328dc654725107089ea9838bbb1bac1c7e',
  sourceSha256: '2312c054be33293e4550b4d151546defea5cf3f83ee802b627749bfceef7e7f2',
  catalogPaths: Object.freeze([
    '/free/gstack-praktikum',
    '/free/proverka-otvetov-ii',
    '/free/kak-ustroen-ii-agent',
  ]),
  sitemapPaths: Object.freeze([
    '/free/gstack-praktikum',
    '/free/proverka-otvetov-ii',
    '/free/kak-ustroen-ii-agent',
  ]),
});

type Discovery = { catalogPaths: readonly string[]; sitemapPaths: readonly string[] };

function discoveryChecks(discovery: Discovery) {
  return [
    () => expect(discovery.catalogPaths).toContain(PATH),
    () => expect(discovery.sitemapPaths).toContain(PATH),
  ];
}

describe('бесплатный практикум «Что ИИ умеет, а что нет — без страшилок» #587', () => {
  it('отдаёт страницу с метаданными, упражнениями и первоисточниками', async () => {
    const props = { params: Promise.resolve({ slug: SLUG }) };
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata(props);
    expect(metadata.title).toBe('Что ИИ умеет, а что нет: бесплатный практикум — GELATO');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${PATH}`);

    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(props)).replaceAll(' ', ' ');
    expect(html).toContain('Что ИИ умеет, а что нет — без страшилок');
    expect(html).toContain('"isAccessibleForFree":true');
    expect(html).toContain('Обычный (узкий) ИИ');
    expect(html).toContain('Общий ИИ (AGI');
    expect(html).toContain('Сверхразум (ASI');
    expect(html).toContain('Измерено, стенд или прогноз?');
    expect(html).toContain('Упражнение 1. Обычный ИИ или сильный?');
    expect(html).toContain('Упражнение 2. Разложите утверждения');
    expect(html).toContain('Вопрос на понимание:');

    // Проверяем наличие всех ключевых ссылок на проверенные первоисточники
    expect(html).toContain('href="https://arxiv.org/abs/2311.02462"');
    expect(html).toContain('href="https://arxiv.org/abs/2410.05229"');
    expect(html).toContain('href="https://www.hbs.edu/faculty/Pages/item.aspx?num=64700"');
    expect(html).toContain('href="https://arxiv.org/abs/2310.06770"');
    expect(html).toContain('href="https://arxiv.org/abs/2401.02843"');
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
