import { expect as dom, type Page } from '@playwright/test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReelBrowser, events, mount, reaction, routeLikes } from './fixtures/reel-actions-5a75165';

const reelId = 'a'.repeat(20);
const reelUrl = `http://reels.test/reels/${reelId}`;
type ShareMode = 'native' | 'unavailable' | 'error' | 'cancel';
type ShareTestWindow = {
  shareCalls: ShareData[];
  clipboardWrites: string[];
  reels: { id: string }[];
};

let browser: Awaited<ReturnType<typeof createReelBrowser>>;
let page: Page;
beforeAll(async () => { browser = await createReelBrowser(); }, 30_000);
beforeEach(async () => { page = await browser.page(390); });
afterEach(async () => { await page?.close(); });
afterAll(async () => { await browser?.close(); });
const shareButton = () => page.getByRole('button', { name: 'Поделиться', exact: true });

async function setup(mode: ShareMode) {
  await page.evaluate(({ mode, reelId }) => {
    const testWindow = window as unknown as ShareTestWindow;
    testWindow.reels[0].id = reelId;
    testWindow.shareCalls = [];
    testWindow.clipboardWrites = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mode === 'unavailable' ? undefined : async (data: ShareData) => {
        testWindow.shareCalls.push(data);
        if (mode === 'cancel') throw new DOMException('Cancelled', 'AbortError');
        if (mode === 'error') throw new Error('Sharing unavailable');
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (url: string) => { testWindow.clipboardWrites.push(url); } },
    });
  }, { mode, reelId });
  await routeLikes(page, [reaction(false, 4, true)]);
  await mount(page, 'page');
  await dom(shareButton()).toBeVisible();
}

const shareCalls = () => page.evaluate(() => (window as unknown as ShareTestWindow).shareCalls);
const clipboardWrites = () => page.evaluate(() => (window as unknown as ShareTestWindow).clipboardWrites);
async function expectShareEvent() {
  expect((await events(page)).filter(([name]) => name === 'reel_share')).toEqual([
    ['reel_share', { reel_id: reelId, course_slug: 'course-a', position: 0 }],
  ]);
}

describe('sharing from the mobile /reels feed (#600)', () => {
  it('sends the reel permalink through navigator.share', async () => {
    await setup('native');
    await shareButton().click();
    expect(await shareCalls()).toEqual([expect.objectContaining({ url: reelUrl })]);
    expect(await clipboardWrites()).toEqual([]);
    await dom(shareButton()).toHaveText('Поделиться');
    await expectShareEvent();
  });

  it('copies the reel permalink and confirms it when navigator.share is absent', async () => {
    await setup('unavailable');
    await page.clock.install();
    if (process.env.REEL_SHARE_SCREENSHOT_DIR) await page.screenshot({
      path: `${process.env.REEL_SHARE_SCREENSHOT_DIR}/reels-390-before.png`,
    });
    await shareButton().click();
    expect(await clipboardWrites()).toEqual([reelUrl]);
    expect(await shareCalls()).toEqual([]);
    await dom(shareButton()).toHaveText('Ссылка скопирована');
    await expectShareEvent();
    if (process.env.REEL_SHARE_SCREENSHOT_DIR) await page.screenshot({
      path: `${process.env.REEL_SHARE_SCREENSHOT_DIR}/reels-390-copied.png`,
    });
    await page.clock.fastForward(2501);
    await dom(shareButton()).toHaveText('Поделиться');
  });

  it('copies the same permalink if native sharing fails', async () => {
    await setup('error');
    await shareButton().click();
    expect(await shareCalls()).toEqual([expect.objectContaining({ url: reelUrl })]);
    expect(await clipboardWrites()).toEqual([reelUrl]);
    await dom(shareButton()).toHaveText('Ссылка скопирована');
    await expectShareEvent();
  });

  it('preserves the click event without copying after native sharing is cancelled', async () => {
    await setup('cancel');
    await shareButton().click();
    expect(await shareCalls()).toEqual([expect.objectContaining({ url: reelUrl })]);
    expect(await clipboardWrites()).toEqual([]);
    await dom(shareButton()).toHaveText('Поделиться');
    await expectShareEvent();
  });
});
