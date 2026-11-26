import { chromium, expect as dom, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';

const lessons = [
  {
    slug: 'roditeli-ravnye-doli',
    prompt: 'Готовый запрос',
    sample: 'Пример результата',
    hash: '8570b5aec62644747b8b47dc7d04d14bad52999375611a1d18bee7ed898f3a82',
  },
  {
    slug: 'nutriciologi-svoya-zametka',
    prompt: '3. Готовый запрос для привычного чата',
    sample: '4. Явно учебный образец',
    hash: '6c66e485ccc61b6adbef700350f8587a5cdcac8750ee023ef5460a1053dee6ae',
  },
];

type CopyFixture = typeof window & { copiedText: string; finishCopy: (allowed: boolean) => void };
const origin = 'https://lesson.test';
const copyName = 'Скопировать запрос';
let browser: Awaited<ReturnType<typeof chromium.launch>>;
let page: Page;
let app: string;
let css: string;

beforeAll(async () => {
  const bundle = await build({
    bundle: true, write: false, format: 'iife', jsx: 'automatic',
    plugins: [{ name: 'isolated-next-routing', setup(builder) {
      builder.onResolve({ filter: /^next\/(link|navigation)$/ }, ({ path }) => ({ path, namespace: 'lesson-routing' }));
      builder.onLoad({ filter: /.*/, namespace: 'lesson-routing' }, ({ path }) => ({
        loader: 'tsx', resolveDir: process.cwd(),
        contents: path === 'next/link' ? 'export default props => <a {...props} />;' :
          'export function notFound() { throw new Error("notFound"); }',
      }));
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import { createRoot } from 'react-dom/client';
      import LessonPage from './src/app/(app)/free/[slug]/page';
      const slug = location.pathname.split('/').pop();
      LessonPage({ params: Promise.resolve({ slug }) }).then(lesson =>
        createRoot(document.getElementById('root')).render(lesson));
    ` },
  });
  app = bundle.outputFiles[0].text;
  const cssPath = 'src/app/globals.css';
  css = (await postcss([tailwind()]).process(await readFile(cssPath, 'utf8'), { from: cssPath })).css;
  browser = await chromium.launch();
}, 30_000);

afterEach(async () => { await page?.close(); });
afterAll(async () => { await browser?.close(); });

async function openLesson(slug: string) {
  page = await browser.newPage({ viewport: { width: 320, height: 760 }, isMobile: true, hasTouch: true });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: app });
    if (url.pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: css });
    if (url.pathname !== `/free/${slug}`) return route.abort();
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="ru"><head>
      <meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css">
      </head><body><main id="root" class="px-4 py-10"></main><script src="/app.js"></script></body></html>` });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText(text: string) {
        const fixture = window as CopyFixture;
        fixture.copiedText = text;
        return new Promise<void>((resolve, reject) => {
          fixture.finishCopy = allowed => allowed ? resolve() : reject(new DOMException('', 'NotAllowedError'));
        });
      },
    } });
  });
  await page.goto(`${origin}/free/${slug}`);
  await dom(page.locator('article h1')).toBeVisible();
}

function section(name: string) {
  return page.locator('details').filter({ has: page.getByRole('heading', { name, exact: true }) });
}

it.each(lessons)('$slug: гость копирует только исходный запрос и видит результат', async ({ slug, prompt, sample, hash }) => {
  await openLesson(slug);
  const request = section(prompt);
  await request.locator('summary').tap();
  const button = request.getByRole('button', { name: copyName });
  await dom(button).toBeVisible({ timeout: 2500 });
  await dom(page.getByRole('button', { name: copyName, includeHidden: true })).toHaveCount(1);
  await dom(section(sample).locator('pre, table')).toHaveCount(1);
  await dom(section(sample).getByRole('button', { includeHidden: true })).toHaveCount(0);

  const status = request.getByRole('status');
  await dom(status).toBeEmpty();
  await button.tap();
  await dom(button).toBeDisabled();
  await dom(status).toBeEmpty();
  const copied = await page.evaluate(() => (window as CopyFixture).copiedText);
  expect(copied).toBe(await request.locator('pre').textContent());
  expect(createHash('sha256').update(copied).digest('hex')).toBe(hash);

  await page.evaluate(() => (window as CopyFixture).finishCopy(true));
  await dom(status).toHaveText('Запрос скопирован.');
  await dom(button).toBeInViewport();
  await dom(status).toBeInViewport();

  await button.tap();
  await dom(status).toBeEmpty();
  await page.evaluate(() => (window as CopyFixture).finishCopy(false));
  await dom(status).toHaveText(/выделите текст запроса.*вручную/i);
  await dom(status).toBeInViewport();
}, 12_000);

it('не добавляет кнопку в другой практикум с блоками команд', async () => {
  await openLesson('gstack-praktikum');
  expect(await page.locator('pre').count()).toBeGreaterThan(0);
  await dom(page.getByRole('button', { name: copyName, includeHidden: true })).toHaveCount(0);
});
