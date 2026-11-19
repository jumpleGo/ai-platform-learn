import React from 'react';
import { expect as dom, type Page } from '@playwright/test';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ReelPage from '@/app/reels/[id]/page';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';
import { createReelBrowser, mount } from './fixtures/reel-actions-5a75165';

const reels = ['a', 'b', 'c', 'd'].map((letter, order) => ({
  id: letter.repeat(20), title: `Рилс ${order + 1}`, description: 'Про ИИ',
  courseSlug: 'course-a', videoPath: `reels/${letter}/video.mp4`,
  published: true, order, likeCount: 4, ctaHref: '/courses/course-a', ctaLabel: 'К курсу',
}));
vi.stubGlobal('React', React);
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => reels }));
vi.mock('@/lib/firebase/admin', () => ({ storageBucketName: 'test', adminStorage: {
  bucket: () => ({ file: () => ({ getMetadata: async () => [{}] }) }),
} }));

let browser: Awaited<ReturnType<typeof createReelBrowser>>;
let page: Page;
beforeAll(async () => { browser = await createReelBrowser(); }, 30_000);
afterEach(async () => { await page?.close(); });
afterAll(async () => { await browser?.close(); });

async function prepare(width = 390, loggedIn = false) {
  page = await browser.page(width);
  await page.route('**/api/reels/*/like', (route) => route.fulfill({
    json: { liked: false, likeCount: 4, isLoggedIn: loggedIn },
  }));
  await installMediaAndData();
}

async function installMediaAndData() {
  // Real DOM, IntersectionObserver, snap and history; only media and account
  // responses are isolated. All browser traffic stays in the existing fixture.
  await page.evaluate((data) => {
    (window as unknown as { reels: typeof data }).reels = data;
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playing = 'true';
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { this.dataset.playing = 'false'; };
    HTMLMediaElement.prototype.load = function () {
      this.dataset.loads = String(Number(this.dataset.loads ?? 0) + 1);
    };
  }, reels);
}

async function current(index: number) {
  await dom(page).toHaveURL(`http://reels.test/reels/${reels[index].id}`);
  await dom(page.locator('video[data-playing="true"]')).toHaveCount(1);
  await dom(page.locator(`[data-reel-id="${reels[index].id}"] video[data-playing="true"]`)).toHaveCount(1);
}

describe('reels swipe navigation (#886)', () => {
  it('passes the published sequence and starting slug to the individual-page feed', async () => {
    const element = await ReelPage({ params: Promise.resolve({ id: reels[1].id }) });
    const feed = React.Children.toArray(element.props.children).find(
      (child) => React.isValidElement(child) && child.type === ReelsMobileFeed,
    ) as React.ReactElement<{ items: { reel: { id: string }; video: string }[]; initialReelId: string }>;
    expect(feed).toBeDefined();
    expect(feed.props.items.map((item) => item.reel.id)).toEqual(reels.map((reel) => reel.id));
    expect(feed.props.initialReelId).toBe(reels[1].id);
    expect(feed.props.items[2].video).toMatch(new RegExp(`/reels/${reels[2].id}/video$`));
  });

  it.each([false, true])('swipes one viewport both ways with one playing video (student=%s)', async (loggedIn) => {
    await prepare(390, loggedIn);
    await mount(page, 'page');
    await current(0);
    const feed = page.locator('section[data-reel-id]').first().locator('..');
    expect(await feed.evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe('y mandatory');
    expect(await page.locator('section[data-reel-id]').first().evaluate((el) => el.clientHeight)).toBe(844);
    const historyLength = await page.evaluate(() => history.length);
    await page.mouse.move(195, 422);
    await page.mouse.wheel(0, 650);
    await current(1);
    await page.mouse.wheel(0, -650);
    await current(0);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(844);
    await dom(page.locator('section[data-reel-id]').nth(1).locator('video')).toHaveAttribute('preload', 'auto');
    await dom(page.locator('section[data-reel-id]').nth(1).locator('video')).toHaveAttribute('data-loads', '1');
    await dom(page.locator('section[data-reel-id]').nth(3).locator('video')).toHaveAttribute('preload', 'none');
  });

  it.each([false, true])('navigates by desktop arrows and leaves editable fields alone (student=%s)', async (loggedIn) => {
    await prepare(1280, loggedIn);
    await mount(page, 'page');
    await current(0);
    await page.keyboard.press('ArrowDown');
    await current(1);
    await page.keyboard.press('ArrowUp');
    await current(0);
    await page.keyboard.press('ArrowUp');
    await current(0);
    await page.evaluate(() => {
      const input = document.createElement('input');
      document.body.append(input);
      input.focus();
    });
    await page.keyboard.press('ArrowDown');
    await current(0);
  });

  it('pauses between snap points and keeps the final reel after rapid swipes', async () => {
    await prepare();
    await mount(page, 'page');
    await current(0);
    const feed = page.locator('section[data-reel-id]').first().locator('..');
    await feed.evaluate((el) => {
      (el as HTMLElement).style.scrollSnapType = 'none';
      el.scrollTo({ top: el.clientHeight / 2, behavior: 'instant' });
    });
    await dom(page.locator('video[data-playing="true"]')).toHaveCount(0);
    await feed.evaluate((el) => {
      (el as HTMLElement).style.scrollSnapType = '';
      for (const index of [3, 1, 3, 2]) el.scrollTo({ top: index * el.clientHeight, behavior: 'instant' });
    });
    await current(2);
    await dom(page.locator('section[data-reel-id]').nth(1).locator('video')).toHaveAttribute('preload', 'auto');
    await dom(page.locator('section[data-reel-id]').nth(3).locator('video')).toHaveAttribute('preload', 'auto');
    await dom(page.locator('section[data-reel-id]').first().locator('video')).toHaveAttribute('preload', 'none');
  });

  it('handles native touch swipes and keeps the slug when rotating the viewport', async () => {
    await prepare();
    const touch = await page.context().newCDPSession(page);
    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const swipe = async (from: number, to: number) => {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: from }] });
      for (let step = 1; step <= 8; step++) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x: 195, y: from + (to - from) * step / 8 }],
        });
        await page.evaluate(() => new Promise<number>((resolve) => requestAnimationFrame(resolve)));
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await mount(page, 'page');
    await current(0);
    await swipe(700, 50);
    await current(1);
    await page.setViewportSize({ width: 844, height: 390 });
    await current(1);
    await dom(page.locator('[data-reel-feed="mobile"]')).toBeVisible();
    await dom(page.locator('[data-reel-feed="mobile"]')).toHaveJSProperty('scrollTop', 390);
    await page.setViewportSize({ width: 390, height: 844 });
    await current(1);
    await swipe(100, 750);
    await current(0);
  }, 15_000);

  it('restores the address after refresh and can swipe to either neighbour', async () => {
    await prepare();
    const html = await page.content();
    await page.route(/^http:\/\/reels\.test\/reels\/[a-z]{20}$/, (route) =>
      route.fulfill({ contentType: 'text/html', body: html }));
    await mount(page, 'page');
    const feed = page.locator('section[data-reel-id]').first().locator('..');
    await feed.evaluate((el) => el.scrollTo({ top: el.clientHeight * 2, behavior: 'instant' }));
    await current(2);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof (window as unknown as { mount: unknown }).mount === 'function');
    await installMediaAndData();
    await mount(page, 'page');
    await current(2);
    const restored = page.locator('section[data-reel-id]').first().locator('..');
    expect(await restored.evaluate((el) => el.scrollTop)).toBe(844 * 2);
    await page.keyboard.press('ArrowUp');
    await current(1);
    await page.keyboard.press('ArrowDown');
    await current(2);
  }, 15_000);
});
