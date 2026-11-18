import { chromium, expect as dom, type Browser, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ReelEventProps } from '../src/lib/analytics/events';

const reelId = 'b'.repeat(20);
const otherId = 'a'.repeat(20);
const origin = 'http://reels.test';
const reelUrl = `${origin}/reels/${reelId}`;
const storageKey = `gelato:reel-liked:${reelId}`;
type TestWindow = {
  mount: () => Promise<void>;
  events: [string, ReelEventProps, string | null][];
  writes: [string, string][];
  restoreStorage: () => void;
};
let browser: Browser;
let page: Page;
let javascript: string;
let stylesheet: string;
let apiCalls: string[];
let pageErrors: string[];

beforeAll(async () => {
  // Mount the actual async route with isolated server data, as in the #560
  // browser harness. All requests stay local; no Next build or cloud access.
  const mocks: Record<string, string> = {
    '@/lib/analytics/track-client': `export const track = (event, props) =>
      window.events.push([event, props, event === 'reel_like'
        ? localStorage.getItem('gelato:reel-liked:' + props.reel_id) : null]);`,
    '@/lib/db/reels': `export const listPublishedReels = async () => ['${otherId}', '${reelId}'].map((id) => ({
      id, title: 'Ролик', description: 'Описание', courseSlug: window.courseSlug,
      videoPath: 'video.mp4', published: true, order: 97, likeCount: 42,
      ctaHref: '/courses/course-a', ctaLabel: 'Открыть курс'
    }));`,
    '@/lib/firebase/admin': `export const storageBucketName = 'local-test';
      export const adminStorage = { bucket: () => ({ file: () => ({
        getMetadata: async () => [{ timeCreated: '2026-11-10T08:30:00.000Z' }]
      }) }) };`,
    '@/lib/site': `export const SITE_URL = '${origin}';`,
  };
  const bundle = await build({
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"', 'process.env': '{}' },
    plugins: [{ name: 'local-reel-page', setup(builder) {
      builder.onResolve({ filter: /^@\/lib\// }, ({ path }) =>
        path in mocks ? { path, namespace: 'reel-mock' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'reel-mock' }, ({ path }) => ({ contents: mocks[path] }));
      // Optional regression run: REEL_LOCAL_LIKE_BASELINE=28766ab npm test -- <this file>.
      // Load the pre-localStorage route and changed dependencies without modifying the checkout.
      if (process.env.REEL_LOCAL_LIKE_BASELINE) {
        builder.onLoad({ filter: /src\/(?:app\/reels\/\[id\]\/page|components\/reels\/(?:reel-player|reels-mobile-feed|reel-share-button))\.tsx$/ }, async ({ path }) => {
          const relative = path.slice(process.cwd().length + 1);
          const { stdout } = await promisify(execFile)('git', ['show', `${process.env.REEL_LOCAL_LIKE_BASELINE}:${relative}`]);
          return { contents: stdout, loader: 'tsx' };
        });
      }
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import ReelPage from './src/app/reels/[id]/page';
      window.events = [];
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
      const root = createRoot(document.getElementById('root'));
      window.mount = async () => {
        const tree = await ReelPage({ params: Promise.resolve({ id: '${reelId}' }) });
        flushSync(() => root.render(tree));
      };
    ` },
  });
  javascript = bundle.outputFiles[0].text;
  stylesheet = (await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), {
    from: 'src/app/globals.css',
  })).css;
  browser = await chromium.launch({ channel: 'chromium' });
}, 30_000);
afterEach(async () => {
  await page?.context().close();
  expect(pageErrors).toEqual([]);
});
afterAll(async () => { await browser?.close(); });

async function setup(width: number, session = false, courseSlug: string | null = 'course-a', saved = false) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  if (session) await context.addCookies([{ name: 'session', value: 'local-student', url: origin }]);
  page = await context.newPage();
  page.setDefaultTimeout(4000);
  apiCalls = [];
  pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) apiCalls.push(url.pathname);
    if (url.origin !== origin) return route.abort();
    if (/^\/reels\/[^/]+$/.test(url.pathname)) return route.fulfill({ contentType: 'text/html', body:
      '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>' });
    if (url.pathname === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: javascript });
    if (url.pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: stylesheet });
    return route.abort();
  });
  await page.addInitScript(({ courseSlug }) => { Object.assign(window, { courseSlug }); }, { courseSlug });
  await page.goto(reelUrl);
  if (saved) await page.evaluate(key => localStorage.setItem(key, 'true'), storageKey);
}
const mount = () => page.evaluate(() => (window as unknown as TestWindow).mount());
const button = () => page.locator(`[data-reel-id="${reelId}"]:visible`)
  .getByRole('button', { name: 'Нравится', exact: true });
const savedLike = () => page.evaluate(key => localStorage.getItem(key), storageKey);
const likes = () => page.evaluate(() => (window as unknown as TestWindow).events.filter(([name]) => name === 'reel_like'));
const confirmedLike = (course_slug: string | null = 'course-a') =>
  ['reel_like', { reel_id: reelId, course_slug, position: 1 }, 'true'];
async function expectState(liked: boolean) {
  await dom(button()).toBeVisible();
  await dom(button()).toBeEnabled();
  await dom(button()).toHaveAttribute('aria-pressed', String(liked));
  await dom(button()).toHaveText('Нравится'); // No shared count, even when the data has likeCount=42.
  expect(await savedLike()).toBe(String(liked));
  expect(apiCalls).toEqual([]);
  expect(pageErrors).toEqual([]);
}

describe('localStorage likes on /reels/<id> (#894)', () => {
  it.each([
    { width: 390, session: false }, { width: 390, session: true },
    { width: 1280, session: false }, { width: 1280, session: true },
  ])('persists likes, unlikes and viewport state ($width px, session=$session)', async ({ width, session }) => {
    await setup(width, session);
    await mount();
    await dom(button()).toBeEnabled();
    await dom(button()).toHaveAttribute('aria-pressed', 'false');
    expect(await likes()).toEqual([]);
    await button().click();
    await expectState(true);
    expect(await likes()).toEqual([confirmedLike()]);
    expect(await page.evaluate(id => localStorage.getItem(`gelato:reel-liked:${id}`), otherId)).toBeNull();
    await page.reload();
    await mount();
    await expectState(true);
    expect(await likes()).toEqual([]); // Restoring a saved like is not a new action.
    await dom(page).toHaveURL(reelUrl);
    await page.setViewportSize({ width: width === 390 ? 1280 : 390, height: 844 });
    await expectState(true);
    await button().click();
    await expectState(false);
    expect(await likes()).toEqual([]); // An unlike is not an added like.
    await page.reload();
    await mount();
    await expectState(false);
    expect(await likes()).toEqual([]);
  }, 20_000);

  it.each([390, 1280])('deduplicates rapid taps across both presentations at %i px', async width => {
    await setup(width, false, null);
    await mount();
    await dom(button()).toBeEnabled();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
      (window as unknown as TestWindow).writes = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) (window as unknown as TestWindow).writes.push([key, value]);
        original.call(this, key, value);
      };
    });
    // Same-task clicks also cover taps before React commits the first update.
    await page.locator(`[data-reel-id="${reelId}"] button[aria-label="Нравится"]`)
      .evaluateAll(nodes => nodes.forEach(node => {
        (node as HTMLButtonElement).click();
        (node as HTMLButtonElement).click();
      }));
    await expectState(true);
    expect(await likes()).toEqual([confirmedLike(null)]);
    expect(await page.evaluate(() => (window as unknown as TestWindow).writes)).toEqual([[storageKey, 'true']]);
    await page.clock.runFor(301);
    await button().click();
    await expectState(false);
    expect(await likes()).toEqual([confirmedLike(null)]);
    await page.clock.runFor(301);
    await button().click();
    await expectState(true);
    expect(await likes()).toEqual([confirmedLike(null), confirmedLike(null)]);
  }, 15_000);

  it.each([
    { width: 390, saved: false }, { width: 390, saved: true },
    { width: 1280, saved: false }, { width: 1280, saved: true },
  ])('recovers from a failed write without a false event ($width px, saved=$saved)', async ({ width, saved }) => {
    await setup(width, false, 'course-a', saved);
    await mount();
    await dom(button()).toBeEnabled();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) throw new DOMException('Storage full', 'QuotaExceededError');
        original.call(this, key, value);
      };
      (window as unknown as TestWindow).restoreStorage = () => { Storage.prototype.setItem = original; };
    });
    await button().click();
    await dom(page.locator(`[data-reel-id="${reelId}"]:visible`).getByRole('status'))
      .toHaveText('Не удалось сохранить лайк. Попробуйте ещё раз.');
    await dom(button()).toBeEnabled();
    await dom(button()).toHaveAttribute('aria-pressed', String(saved));
    expect(await savedLike()).toBe(saved ? 'true' : null);
    expect(await likes()).toEqual([]);
    expect(pageErrors).toEqual([]);
    await page.evaluate(() => (window as unknown as TestWindow).restoreStorage());
    await page.clock.runFor(301);
    await button().click();
    await expectState(!saved);
    await dom(page.locator(`[data-reel-id="${reelId}"]:visible`).getByRole('status')).toHaveCount(0);
    expect(await likes()).toEqual(saved ? [] : [confirmedLike()]);
  }, 15_000);

  it.each([390, 1280])('keeps the button usable when the initial storage read fails at %i px', async width => {
    await setup(width);
    await page.evaluate(() => {
      const original = Storage.prototype.getItem;
      // Storage.prototype is shared with sessionStorage, which Next's debug channel uses.
      Storage.prototype.getItem = function(key) {
        if (this === localStorage) throw new DOMException('Storage blocked', 'SecurityError');
        return original.call(this, key);
      };
      (window as unknown as TestWindow).restoreStorage = () => { Storage.prototype.getItem = original; };
    });
    await mount();
    await dom(button()).toBeEnabled();
    await dom(button()).toHaveAttribute('aria-pressed', 'false');
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await button().click();
    await dom(page.locator(`[data-reel-id="${reelId}"]:visible`).getByRole('status')).toBeVisible();
    await dom(button()).toBeEnabled();
    expect(await likes()).toEqual([]);
    expect(pageErrors).toEqual([]);
    await page.evaluate(() => (window as unknown as TestWindow).restoreStorage());
    expect(await savedLike()).toBeNull();
    await page.clock.runFor(301);
    await button().click();
    await expectState(true);
    await dom(page.locator(`[data-reel-id="${reelId}"]:visible`).getByRole('status')).toHaveCount(0);
    expect(await likes()).toEqual([confirmedLike()]);
  }, 15_000);
});
