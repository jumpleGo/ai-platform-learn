import { expect as dom, type Page } from '@playwright/test';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createReelBrowser, events, expectReaction, mount, reaction, routeLikes } from './fixtures/reel-actions-5a75165';

let browser: Awaited<ReturnType<typeof createReelBrowser>>;
let page: Page;
beforeAll(async () => { browser = await createReelBrowser(); }, 30_000);
afterEach(async () => { await page?.close(); });
afterAll(async () => { await browser?.close(); });

it.each([390, 1280])('restores likes after reload and resize at %i px', async (width) => {
  page = await browser.page(width);
  // открытие одно ~1,1–2,1 с (замер #649, до и после #618 одинаково), в общем прогоне под нагрузкой превышает 4 с; таймаут поднят только для навигации.
  page.setDefaultNavigationTimeout(15000);
  const calls = await routeLikes(page, [reaction(true, 8, true), reaction(false, 7),
    reaction(false, 7, true), reaction(true, 8)]);
  await mount(page, 'page');
  const presentation = page.locator(width === 390 ? 'section[data-reel-id]' : 'article');
  const button = presentation.getByRole('button', { name: 'Лайк' });
  await dom(button).toBeVisible();
  await expectReaction(button, true, 8);
  expect(calls).toHaveLength(1); // Desktop and mobile share the read.
  await button.click();
  await expectReaction(button, false, 7);
  expect((await events(page)).filter(([event]) => event === 'reel_like')).toEqual([]);
  await page.reload();
  await mount(page, 'page');
  await expectReaction(button, false, 7);
  await button.click();
  await dom(button).toHaveText('8');
  expect((await events(page)).filter(([event]) => event === 'reel_like')).toEqual([
    ['reel_like', { reel_id: 'saved-reel', course_slug: 'course-a', position: 0 }],
  ]);
  if (process.env.REEL_LIKE_SCREENSHOT_DIR) await page.screenshot({
    path: `${process.env.REEL_LIKE_SCREENSHOT_DIR}/reels-${width}-student.png`, fullPage: true,
  });
  await page.setViewportSize({ width: width === 390 ? 1280 : 390, height: 844 });
  const alternate = page.locator(width === 390 ? 'article' : 'section[data-reel-id]')
    .getByRole('button', { name: 'Лайк' });
  await dom(alternate).toBeVisible();
  await expectReaction(alternate, true, 8);
  expect(calls.map(({ method }) => method)).toEqual(['GET', 'POST', 'GET', 'POST']);
}, 20_000);

it.each([390, 1280])('shows guest count and login at %i px', async (width) => {
  page = await browser.page(width);
  // открытие одно ~1,1–2,1 с (замер #649, до и после #618 одинаково), в общем прогоне под нагрузкой превышает 4 с; таймаут поднят только для навигации.
  page.setDefaultNavigationTimeout(15000);
  const calls = await routeLikes(page, [reaction(false, 42, false)]);
  await mount(page, 'page');
  const presentation = page.locator(width === 390 ? 'section[data-reel-id]' : 'article');
  const login = presentation.getByRole('link', { name: 'Войти, чтобы поставить лайк' });
  await dom(login).toBeVisible();
  await dom(login).toHaveAttribute('href', '/login');
  await dom(presentation.getByText('42', { exact: true })).toBeVisible();
  await dom(presentation.getByRole('button', { name: 'Лайк' })).toHaveCount(0);
  expect(calls.map(({ method }) => method)).toEqual(['GET']);
  expect((await events(page)).filter(([event]) => event === 'reel_like')).toEqual([]);
  if (process.env.REEL_LIKE_SCREENSHOT_DIR) await page.screenshot({
    path: `${process.env.REEL_LIKE_SCREENSHOT_DIR}/reels-${width}-guest.png`, fullPage: true,
  });
}, 20_000);
