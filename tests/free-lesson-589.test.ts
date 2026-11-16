import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getStandaloneFreeLesson, SITE_URL } from '@/lib/free-lessons';
import StandaloneFreeLessonPage, {
  generateMetadata, generateStaticParams,
} from '@/app/(app)/free/[slug]/page';
import FreePage from '@/app/(app)/free/page';
import sitemap from '@/app/sitemap';
import { GET as getLlms } from '@/app/llms.txt/route';

// Как в #587: без обращения к Firestore, записей курса и входа.
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/reels-availability', () => ({ hasPublishedReels: async () => false }));

const SLUG = 'doverie-k-ii';
const PATH = `/free/${SLUG}`;

// Опубликованные слаги из src/lib/free-lessons.ts после слияния, до записи #589.
// SHA256 относится к полному исходному файлу в указанном коммите.
// Минимальная фикстура содержит только происхождение и буквальный список;
// история репозитория и origin/main во время теста не читаются.
const OLD_LESSONS = Object.freeze({
  commit: '44b95d71657f2863850e1666203e48d93ab2ef83',
  sourceSha256: '10eba9cba1244340c004b5866d9208d4b1bf840d0f280351a1059e65ce6a9d9c',
  slugs: Object.freeze([
    'gstack-praktikum',
    'proverka-otvetov-ii',
    'kak-ustroen-ii-agent',
    'sam-i-ii',
    'chto-umeet-ii',
  ]),
});

function checkDiscovery(paths: readonly string[]) {
  expect(paths).toContain(PATH);
  expect(paths.filter((path) => path === PATH)).toHaveLength(1);
}

describe('бесплатный практикум о доверии к инструментам ИИ #589', () => {
  it('отдаёт статическую бесплатную страницу с title, canonical и первоисточниками', async () => {
    const props = { params: Promise.resolve({ slug: SLUG }) };
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata(props);
    expect(metadata.title).toBe('Как понять, что помощнику ИИ можно доверять — бесплатный практикум — GELATO');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${PATH}`);

    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(props)).replaceAll('\u00a0', ' ');
    expect(html).toContain('Как понять, что помощнику ИИ можно доверять');
    expect(html).toContain('"isAccessibleForFree":true');
    for (const label of ['«Известный автор»', '«Проверенная версия»', '«Разрешённые действия»']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Учебный пример: правильный ответ и лишнее действие');
    expect(html).toContain('Упражнение. Что ещё нужно проверить?');
    expect(html).toContain('Короткий список проверок перед установкой');
    expect(html).toContain('href="https://arxiv.org/abs/2611.01976"');
    expect(html).toContain('href="https://arxiv.org/abs/2611.03772"');
    expect(html).not.toContain('<pre');
    expect(html).not.toContain('<code');

    const lesson = getStandaloneFreeLesson(SLUG);
    expect(lesson).not.toBeNull();
    const finalSection = lesson!.body.split(/^## /m).at(-1);
    expect(finalSection).toMatch(/^Вопрос на понимание\n/);
    expect(finalSection).toContain('**Ответ:**');
  });

  it('есть ровно один раз в списке /free при пустом каталоге курсов', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    const paths = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    checkDiscovery(paths);
    for (const slug of OLD_LESSONS.slugs) expect(paths).toContain(`/free/${slug}`);
  });

  it('есть ровно один раз в sitemap при пустой БД', async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    checkDiscovery(paths);
    for (const slug of OLD_LESSONS.slugs) expect(paths).toContain(`/free/${slug}`);
  });

  it('добавляет практикум в llms.txt', async () => {
    const text = await (await getLlms()).text();
    expect(text).toContain(`- [Как понять, что помощнику ИИ можно доверять](${SITE_URL}${PATH}):`);
  });

  it('те же проверки списка /free и sitemap падают на замороженной старой фикстуре', () => {
    const oldPaths = OLD_LESSONS.slugs.map((slug) => `/free/${slug}`);
    let oldFails = 0;
    for (const surface of ['catalog', 'sitemap']) {
      expect(() => checkDiscovery(oldPaths), surface).toThrow(PATH);
      oldFails++;
    }
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(2);
  });
});
