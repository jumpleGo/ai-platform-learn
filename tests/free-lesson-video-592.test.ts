import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SITE_URL, standaloneFreeLessonPath } from '@/lib/free-lessons';
import StandaloneFreeLessonPage, {
  generateMetadata, generateStaticParams,
} from '@/app/(app)/free/[slug]/page';
import FreePage from '@/app/(app)/free/page';
import sitemap from '@/app/sitemap';
import { GET as getLlms } from '@/app/llms.txt/route';

// Проверяем доступность практикума при пустой БД, без Firestore и входа.
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/reels-availability', () => ({ hasPublishedReels: async () => false }));

const SLUG = 'kak-sdelan-rolik';
const PATH = `/free/${SLUG}`;

// Литерал списка до #592 и SHA-256 исходного src/lib/free-lessons.ts.
// Происхождение фиксируем один раз; тест не читает git или старые файлы.
const OLD_DISCOVERY = Object.freeze({
  sourceSha256: '5cce13e231821bff75fbd55feb654703812e7366e4a7fcf73bdd4cd0db94cf95',
  slugs: Object.freeze([
    'gstack-praktikum',
    'proverka-otvetov-ii',
    'kak-ustroen-ii-agent',
    'sam-i-ii',
  ]),
});

function checkDiscovery(paths: readonly string[]) {
  expect(paths).toContain(PATH);
  expect(paths.filter((path) => path === PATH)).toHaveLength(1);
  for (const slug of OLD_DISCOVERY.slugs) {
    expect(paths).toContain(standaloneFreeLessonPath(slug));
  }
}

describe('бесплатный практикум о способах создания ролика #592', () => {
  it('отдаёт страницу с canonical, источником, вопросом и ссылкой на ролики', async () => {
    const props = { params: Promise.resolve({ slug: SLUG }) };
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata(props);
    expect(metadata.title).toBe('Как сделан ролик: съёмка, ИИ или графика — бесплатный практикум — GELATO');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${PATH}`);

    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(props)).replaceAll('\u00a0', ' ');
    expect(html).toContain('"isAccessibleForFree":true');
    expect(html).toContain('Как сделан ролик: съёмка, ИИ или графика');
    expect(html).toContain('Почему работу настоящего приложения лучше записывать с экрана');
    expect(html).toContain('Вопрос на понимание');
    expect(html.replace(/<[^>]+>/g, '')).toContain('Ответ:');
    for (const section of ['what-it-can-break-down', 'examples']) {
      expect(html).toContain(`https://github.com/JuneYaooo/rea-video/blob/ebe853e330d63719a1f91754f789647c515eac19/README.md#${section}`);
    }
    expect(html).toContain('href="/reels"');
  });

  it('есть один раз в списке /free даже при пустой БД', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    const paths = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    checkDiscovery(paths);
  });

  it('есть один раз в sitemap даже при пустой БД', async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    checkDiscovery(paths);
  });

  it('попадает в llms.txt из общего списка практикумов', async () => {
    const text = await (await getLlms()).text();
    expect(text).toContain(`](${SITE_URL}${PATH}):`);
  });

  it('те же проверки каталога и sitemap отклоняют старый список', () => {
    const oldPaths = OLD_DISCOVERY.slugs.map(standaloneFreeLessonPath);
    let oldFails = 0;
    for (const surface of ['catalog', 'sitemap']) {
      expect(() => checkDiscovery(oldPaths), surface).toThrow(PATH);
      oldFails++;
    }
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(2);
  });
});
