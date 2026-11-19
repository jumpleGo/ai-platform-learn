// Minimal mounted reproduction from 5a751653cbab3adfe34fb2c0f70ef293bed567fc.
// Source: src/components/reels/reel-actions.tsx, SHA256: 53becf7e8621d3c8570692742a2bad978f9cfde1b08e31dbb0ccc7771e9935fe.
// handleLike is verbatim. Only decorative markup and the direct-call hook bypass
// are omitted; real useState preserves the original mounted behavior.
import React, { useState } from 'react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import type { Locator, Page } from '@playwright/test';
export function OldReelActions({ eventProps, initialLikeCount = 0, initialLiked = false }:
  { eventProps: ReelEventProps; initialLikeCount?: number; initialLiked?: boolean }) {
  const reelId = eventProps.reel_id;
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const handleLike = async () => {
    track(EVENTS.reelLiked, eventProps);

    const prevLiked = liked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    // Optimistic update
    setLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const res = await fetch(`/api/reels/${reelId}/like`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Like request failed');
      }
      const data = await res.json();
      if (typeof data.liked === 'boolean' && typeof data.likeCount === 'number') {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch {
      // Rollback on error
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  return <button aria-label="Лайк" aria-pressed={liked} onClick={handleLike}>{likeCount}</button>;
}

// Shared mounted-browser harness. Playwright, esbuild and PostCSS are already in
// the lockfile; server data and analytics are isolated before bundling the UI.
// Dynamic Node imports below are excluded from the browser's OldReelActions bundle.
export async function createReelBrowser() {
  const [{ chromium }, { build }, { default: postcss }, { default: tailwind }, { readFile }] = await Promise.all([
    import('@playwright/test'), import('esbuild'), import('postcss'),
    import('@tailwindcss/postcss'), import('node:fs/promises'),
  ]);
  const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), {
    from: 'src/app/globals.css',
  });
  const mocks: Record<string, string> = {
    '@/lib/analytics/track-client': 'export const track = (event, props) => window.events.push([event, props]);',
    '@/lib/db/reels': 'export const listPublishedReels = async () => window.reels;',
    '@/lib/firebase/admin': `export const storageBucketName = 'test';
      export const adminStorage = { bucket: () => ({ file: () => ({ getSignedUrl: async () => ['/video.mp4'] }) }) };`,
  };
  const bundle = await build({
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"', 'process.env': '{}' },
    external: ['@playwright/test', 'esbuild', 'postcss', '@tailwindcss/postcss', 'node:*'],
    plugins: [{ name: 'isolated-reel-data', setup(builder) {
      builder.onResolve({ filter: /^@\/lib\// }, (args) =>
        args.path in mocks ? { path: args.path, namespace: 'reel-mock' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'reel-mock' }, (args) => ({ contents: mocks[args.path] }));
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { ReelActions } from './src/components/reels/reel-actions';
      import { ReelLikesProvider } from './src/components/reels/reel-likes-provider';
      import { ReelPlayer } from './src/components/reels/reel-player';
      import ReelsPage from './src/app/reels/page';
      import { OldReelActions } from './tests/fixtures/reel-actions-5a75165';
      window.events = [];
      window.reels = [{ id: 'saved-reel', title: 'Сохранённый ролик', courseSlug: 'course-a',
        videoPath: 'video.mp4', order: 97, published: true, likeCount: 4 }];
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
      let root = createRoot(document.getElementById('root'));
      window.mount = async (kind, props) => {
        const child = kind === 'page' ? await ReelsPage()
          : kind === 'player' ? <ReelPlayer {...props} onToggleSound={() => {}} />
          : kind === 'old' ? <OldReelActions {...props} />
          : kind === 'pair' ? <ReelLikesProvider><ReelActions {...props} layout="inline" /><ReelActions {...props} /></ReelLikesProvider>
          : <ReelActions {...props} />;
        flushSync(() => root.render(child));
      };
      window.unmount = () => { root.unmount(); root = createRoot(document.getElementById('root')); };
    ` },
  });
  const browser = await chromium.launch({ channel: 'chromium' });
  return {
    close: () => browser.close(),
    async page(width = 390, options?: { navigationTimeout?: number } | number) {
      const navigationTimeout = typeof options === 'number' ? options : options?.navigationTimeout;
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      page.setDefaultTimeout(4000);
      if (navigationTimeout !== undefined) page.setDefaultNavigationTimeout(navigationTimeout);
      // Every request is fulfilled locally or aborted, including media and APIs.
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'reels.test') return route.abort();
        if (url.pathname === '/reels' || /^\/reels\/[^/]+$/.test(url.pathname)) return route.fulfill({ contentType: 'text/html', body:
          '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>' });
        if (url.pathname === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0].text });
        if (url.pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: css.css });
        if (url.pathname === '/icon.svg') return route.fulfill({ contentType: 'image/svg+xml', body: await readFile('src/app/icon.svg') });
        if (url.pathname === '/logo.webp' || (url.pathname === '/_next/image' && url.searchParams.get('url') === '/logo.webp')) {
          return route.fulfill({ contentType: 'image/webp', body: await readFile('public/logo.webp') });
        }
        return route.abort();
      });
      // The parser-loaded bundle and mount hook are required; unrelated images
      // must not hold up opening the page until the full load event.
      await page.goto('http://reels.test/reels', {
        waitUntil: 'domcontentloaded',
        ...(navigationTimeout !== undefined ? { timeout: navigationTimeout } : {}),
      });
      await page.waitForFunction(() => typeof (window as unknown as ReelTestWindow).mount === 'function');
      return page;
    },
  };
}

type ReelTestWindow = {
  mount: (kind: string, props: unknown) => Promise<void>;
  unmount: () => void;
  events: [string, ReelEventProps][];
};
export const mount = (page: Page, kind: string, props: unknown = {}) =>
  page.evaluate(({ kind, props }) => (window as unknown as ReelTestWindow).mount(kind, props), { kind, props });
export const events = (page: Page) => page.evaluate(() => (window as unknown as ReelTestWindow).events);
export const unmount = (page: Page) => page.evaluate(() => (window as unknown as ReelTestWindow).unmount());
export async function expectReaction(button: Locator, liked: boolean, count: number) {
  const { expect } = await import('@playwright/test');
  await expect(button).toHaveText(String(count));
  await expect(button).toHaveAttribute('aria-pressed', String(liked));
}
export const reaction = (liked: boolean, likeCount: number, isLoggedIn?: boolean) => ({
  body: { liked, likeCount, ...(isLoggedIn === undefined ? {} : { isLoggedIn }) },
});
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
export type Reply = { body?: unknown; status?: number; abort?: boolean };
export async function routeLikes(page: Page, replies: (Reply | Promise<Reply>)[]) {
  const calls: { url: string; method: string }[] = [];
  await page.route('**/api/reels/*/like', async (route) => {
    calls.push({ url: new URL(route.request().url()).pathname, method: route.request().method() });
    const reply = await replies.shift();
    if (!reply || reply.abort) return route.abort();
    await route.fulfill({ status: reply.status ?? 200, json: reply.body });
  });
  return calls;
}
