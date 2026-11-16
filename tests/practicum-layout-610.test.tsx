import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FreePage from '@/app/(app)/free/page';
import StandaloneFreeLessonPage from '@/app/(app)/free/[slug]/page';
import sitemap from '@/app/sitemap';
import { Markdown } from '@/components/markdown';
import { PracticumSections } from '@/components/practicum-sections';
import { STANDALONE_FREE_LESSONS, standaloneFreeLessonPath } from '@/lib/free-lessons';
import { nbspMarkdown } from '@/lib/typography';

const { getCourses } = vi.hoisted(() => ({ getCourses: vi.fn() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: getCourses }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

// Минимальный старый порядок ссылок из src/app/(app)/free/page.tsx до #610.
// SHA-256 и коммит зафиксированы при подготовке; тест не читает git или origin.
const OLD_FREE_PAGE = Object.freeze({
  commit: '39c617e5c62469997c188333729c779f9082d60d',
  sourceSha256: 'c582bfdf055fa3d86c9b0ce4a742686d9026f9e410457fe1e5c4e731087d7fa9',
  paths: Object.freeze(['/free/gstack-praktikum', '/courses/claude-code/lessons/2']),
});

const published = STANDALONE_FREE_LESSONS.filter((lesson) => lesson.published);
const practicumPaths = published.map((lesson) => standaloneFreeLessonPath(lesson.slug));
const videoPaths = ['/courses/claude-code/lessons/2', '/courses/claude-code/lessons/3'];

beforeEach(() => {
  // Поля, используемые настоящим freeLessonCards; каталог не подменяем.
  getCourses.mockResolvedValue([{
    id: 'free-hub', slug: 'claude-code', title: 'Бесплатные видеоуроки', isTest: false,
    lessons: [2, 3].map((number) => ({
      id: `lesson-${number}`, number, access: 'free', title: `Видеоурок ${number}`,
      description: 'Открытый видеоурок', durationSec: 120,
      previewImageUrl: null, coverCaption: null, views: 0,
    })),
  }]);
});

function hrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
}

function textContent(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function codeBlocks(html: string): string[] {
  return [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map((match) => match[1]);
}

function summaryTitles(html: string): string[] {
  return [...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)]
    .map((match) => textContent(match[1]));
}

// Один и тот же критерий для настоящего /free и замороженного старого порядка.
function expectVideosBeforePracticums(paths: readonly string[]) {
  const videos = paths.flatMap((path, index) => /^\/courses\/[^/]+\/lessons\/\d+$/.test(path) ? [index] : []);
  const practicums = paths.flatMap((path, index) => path.startsWith('/free/') ? [index] : []);
  expect(videos.length).toBeGreaterThan(0);
  expect(practicums.length).toBeGreaterThan(0);
  expect(Math.max(...videos)).toBeLessThan(Math.min(...practicums));
}

describe('раскладка практикумов #610', () => {
  it.each([undefined, 'vibecoding'])('все видео идут перед практикумами на /free (from=%s)', async (from) => {
    const html = renderToStaticMarkup(await FreePage({ searchParams: Promise.resolve({ from }) }));
    const paths = hrefs(html);
    for (const video of videoPaths) expect(paths).toContain(video);
    expect(paths.filter((path) => path.startsWith('/free/'))).toEqual(practicumPaths);
    expectVideosBeforePracticums(paths);

    const practice = html.match(/<section\b[^>]*aria-labelledby="free-practice-title"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    expect(practice).toBeDefined();
    expect(practice).toContain('grid-cols-2');
    expect(practice).toContain('lg:grid-cols-3');
    expect(practice).toContain('xl:grid-cols-4');
    const teasers = [...practice!.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)];
    expect(teasers).toHaveLength(published.length);
    for (const [, attributes, content] of teasers) {
      expect(attributes).toContain('truncate');
      expect(textContent(content).length).toBeLessThan(60);
    }
    const titles = [...practice!.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)];
    expect(titles).toHaveLength(published.length);
    for (const [, title] of titles) expect(textContent(title).length).toBeLessThan(40);
  });

  it('тот же критерий падает на замороженном старом порядке', () => {
    expect(() => expectVideosBeforePracticums(OLD_FREE_PAGE.paths)).toThrow();
    console.info('FAILS_ON_OLD=true');
  });

  it('практикумы остаются доступны при пустом каталоге видео и в sitemap', async () => {
    getCourses.mockResolvedValue([]);
    const html = renderToStaticMarkup(await FreePage({}));
    expect(hrefs(html).filter((path) => path.startsWith('/free/'))).toEqual(practicumPaths);
    expect(html).not.toContain('Бесплатные уроки скоро появятся.');
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(paths.filter((path) => path.startsWith('/free/'))).toEqual(practicumPaths);
  });

  it.each(published)('$slug: разделы сохраняют весь текст, команды и ссылки body', async (lesson) => {
    const html = renderToStaticMarkup(await StandaloneFreeLessonPage({
      params: Promise.resolve({ slug: lesson.slug }),
    }));
    // Старый способ вывода body — независимый эталон сохранности содержимого.
    const body = renderToStaticMarkup(<Markdown source={nbspMarkdown(lesson.body)} variant="read" />);
    const headings = [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)]
      .map((match) => textContent(match[1]));
    expect(headings.length).toBeGreaterThan(0);
    expect(summaryTitles(html)).toEqual(headings);
    const details = [...html.matchAll(/<details\b([^>]*)>/g)];
    expect(details).toHaveLength(headings.length);
    expect(details.map((match) => /\bopen(?:=|\s|$)/.test(match[1])))
      .toEqual(headings.map((_, index) => index === 0));
    expect(textContent(html)).toContain(textContent(body));
    expect(codeBlocks(html)).toEqual(codeBlocks(body));
    // Две навигационные ссылки обрамляют все ссылки body, включая повторы.
    const bodyLinks = [...lesson.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
      .map((match) => hrefs(renderToStaticMarkup(<a href={match[1]} />))[0]);
    expect(hrefs(html)).toEqual(['/free', ...bodyLinks, '/free']);
  });

  it('сохраняет вступление, подзаголовки и ## внутри блока команд', () => {
    const source = [
      'Вступление с [примером](https://example.com/start).', '',
      '## Первый раздел', '',
      '```bash', '## Это комментарий, а не раздел', 'printf "готово\\n"', '```', '',
      '### Подзаголовок', '', 'Подсказка [дальше](/free/gstack-praktikum).', '',
      '## Второй раздел', '', 'Финал [источник](https://example.com/end?q=1&lang=ru).',
    ].join('\n');
    const html = renderToStaticMarkup(<PracticumSections source={source} />);
    const body = renderToStaticMarkup(<Markdown source={source} variant="read" />);
    expect(summaryTitles(html)).toEqual(['Первый раздел', 'Второй раздел']);
    expect(html.indexOf('Вступление')).toBeLessThan(html.indexOf('<details'));
    expect(html).toMatch(/<h3\b[^>]*>Подзаголовок<\/h3>/);
    expect(textContent(html)).toBe(textContent(body));
    expect(codeBlocks(html)).toEqual(codeBlocks(body));
    expect(hrefs(html)).toEqual(hrefs(body));
  });

  it('сохраняет материал без заголовков целиком', () => {
    const source = 'Прочитайте [источник](https://example.com).\n\n```bash\nnode -v\n```';
    const html = renderToStaticMarkup(<PracticumSections source={source} />);
    const body = renderToStaticMarkup(<Markdown source={source} variant="read" />);
    expect(html).not.toContain('<details');
    expect(textContent(html)).toBe(textContent(body));
    expect(codeBlocks(html)).toEqual(codeBlocks(body));
    expect(hrefs(html)).toEqual(hrefs(body));
  });
});
