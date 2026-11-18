import { chromium, expect as dom, type Browser, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const id = 'b'.repeat(20), origin = 'http://reels.test';
let browser: Browser, page: Page, javascript: string, css: string;
let release: () => void;
beforeAll(async () => {
  const mocks: Record<string, string> = {
    '@/lib/analytics/track-client': `export const track = (name, props) => sessionStorage.setItem('events',
      JSON.stringify([...JSON.parse(sessionStorage.getItem('events') || '[]'), [name, props, location.pathname]]));`,
    '@/lib/db/reels': `export const listPublishedReels = async () => [{ id: '${id}', title: 'Ролик',
      courseSlug: window.courseSlug, ctaHref: window.ctaHref, ctaLabel: 'Открыть обучение',
      videoPath: 'video.mp4', published: true, order: 97 }];`,
    '@/lib/firebase/admin': `export const storageBucketName = 'test'; export const adminStorage = {
      bucket: () => ({ file: () => ({ getMetadata: async () => [{}] }) }) };`,
    '@/lib/site': `export const SITE_URL = '${origin}';`,
    'next/navigation': `export const usePathname = () => location.pathname; export const notFound = () => { throw Error('404'); };`,
  };
  const bundle = await build({ bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"', 'process.env': '{}' },
    plugins: [{ name: 'isolated-course-cta', setup(builder) {
      builder.onResolve({ filter: /^(?:@\/lib\/|next\/navigation$)/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path] }));
      if (process.env.REEL_CTA_BASELINE) builder.onLoad({ filter: /src\/(?:app\/reels\/\[id\]\/page|components\/reels\/(?:reel-player|reel-cta))\.tsx$/ }, ({ path }) => ({
        contents: execFileSync('git', ['show', `${process.env.REEL_CTA_BASELINE}:${path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx',
      }));
    } }], stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client'; import { flushSync } from 'react-dom';
      import ReelPage from './src/app/reels/[id]/page';
      import { ReelCtaArrival } from './src/components/reels/reel-course-link';
      HTMLMediaElement.prototype.play = () => Promise.resolve(); HTMLMediaElement.prototype.pause = () => {};
      const root = createRoot(document.getElementById('root'));
      window.mount = async () => {
        const tree = location.pathname.startsWith('/reels/') ? await ReelPage({ params: Promise.resolve({ id: '${id}' }) }) : <h1>Обучение</h1>;
        flushSync(() => root.render(<><ReelCtaArrival />{tree}</>));
      }; window.mount();
    ` } });
  javascript = bundle.outputFiles[0].text;
  css = (await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: 'src/app/globals.css' })).css;
  browser = await chromium.launch({ channel: 'chromium' });
}, 30_000);
afterEach(async () => { release?.(); await page?.context().close(); });
afterAll(async () => { await browser?.close(); });
async function setup(width: number, session: boolean, courseSlug = 'course-a', ctaHref = '/courses/course-b/lessons/2?from=reels#start') {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  if (session) await context.addCookies([{ name: 'session', value: 'local-student', url: origin }]);
  page = await context.newPage(); page.setDefaultTimeout(4000);
  const destination = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: javascript });
    if (url.pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: css });
    if (url.pathname.startsWith('/courses/')) await destination;
    if (/^\/(?:reels|courses)\//.test(url.pathname)) return route.fulfill({ contentType: 'text/html', body:
      '<html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>' });
    return route.abort();
  });
  await page.addInitScript(data => Object.assign(window, data), { courseSlug, ctaHref });
  await page.goto(`${origin}/reels/${id}`);
}
const link = () => page.locator('[data-reel-course-link]:visible');
const events = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('events') || '[]').filter(([name]: [string]) => name === 'reel_cta_click'));
describe.each([390, 1280])('course CTA at %i px', width => {
  it.each([false, true])('overlays the video and records the target only after arrival (session=%s)', async session => {
    await setup(width, session);
    await dom(page.locator('video:visible')).toBeVisible();
    if (process.env.REEL_CTA_SCREENSHOTS && width === 390 && !session) await page.screenshot({ path: `${process.env.REEL_CTA_SCREENSHOTS}/${process.env.REEL_CTA_BASELINE ? 'before' : 'after'}-390.png` });
    await dom(link()).toHaveText('Открыть обучение');
    await dom(link()).toHaveAttribute('href', '/courses/course-b/lessons/2?from=reels#start');
    const box = await link().boundingBox(), video = await page.locator('video:visible').boundingBox();
    expect(box && video && box.y >= video.y + video.height / 2 && box.y + box.height <= video.y + video.height).toBe(true);
    const before = await link().evaluate(element => {
      (element as HTMLAnchorElement).click(); (element as HTMLAnchorElement).click();
      return JSON.parse(sessionStorage.getItem('events') || '[]').filter(([name]: [string]) => name === 'reel_cta_click');
    });
    expect(before).toEqual([]);
    release(); await dom(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
    expect(await events()).toEqual([['reel_cta_click', { reel_id: id, course_slug: 'course-b', position: 0, lesson: '2' }, '/courses/course-b/lessons/2']]);
    await page.reload(); expect(await events()).toHaveLength(1);
  }, 15_000);
  it.each([false, true])('hides the button without a related course (session=%s)', async session => {
    await setup(width, session, '');
    await dom(page.locator('video:visible')).toBeVisible();
    await dom(link()).toHaveCount(0); expect(await events()).toEqual([]);
  }, 15_000);
  it('uses the course fallback when no lesson link is stored', async () => {
    await setup(width, false, 'course-a', '');
    await dom(link()).toHaveAttribute('href', '/courses/course-a');
    await link().evaluate(element => (element as HTMLAnchorElement).click()); release();
    await dom(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
    expect(await events()).toEqual([['reel_cta_click', { reel_id: id, course_slug: 'course-a', position: 0, lesson: null }, '/courses/course-a']]);
  }, 15_000);
});
it('confirms SPA arrival once while the root layout stays mounted', async () => {
  await setup(390, false);
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault(), { once: true }));
  await link().click(); expect(await events()).toEqual([]);
  await page.evaluate(async () => {
    history.pushState(null, '', '/courses/course-b/lessons/2');
    await (window as unknown as { mount: () => Promise<void> }).mount();
  });
  await dom(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
  expect(await events()).toHaveLength(1);
}, 15_000);
