import { expect as dom, type Page } from '@playwright/test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createReelBrowser, deferred, events, expectReaction, mount, reaction, routeLikes, unmount, type Reply,
} from './fixtures/reel-actions-5a75165';

const eventProps = { reel_id: 'reel-1', course_slug: 'course-a', position: 7 };
const props = { eventProps, initialLikeCount: 4 };
const kind = process.env.REEL_LIKE_USE_OLD === '1' ? 'old' : 'actions';
let browser: Awaited<ReturnType<typeof createReelBrowser>>;
let page: Page;
beforeAll(async () => { browser = await createReelBrowser(); }, 30_000);
beforeEach(async () => { page = await browser.page(); });
afterEach(async () => { await page?.close(); });
afterAll(async () => { await browser?.close(); });
const like = () => page.getByRole('button', { name: 'Лайк', exact: true });

const noEvents = async () => expect(await events(page)).toEqual([]);
const methods = (calls: { method: string }[]) => calls.map(({ method }) => method);
async function setup(replies: (Reply | Promise<Reply>)[], data: unknown = props, component = kind) {
  const calls = await routeLikes(page, replies);
  await mount(page, component, data);
  return calls;
}


describe('confirmed reel reaction #560 in Chromium', () => {
  it('shares in-flight and confirmed state across controls', async () => {
    const added = deferred<Reply>();
    const calls = await setup([reaction(false, 4, true), added.promise], props, 'pair');
    const buttons = like();
    await dom(buttons.first()).toBeEnabled();
    await dom(buttons.last()).toBeEnabled();
    expect(calls).toHaveLength(1);
    await buttons.evaluateAll((nodes) => nodes.forEach((node) => (node as HTMLButtonElement).click()));
    await expect.poll(() => calls.length).toBe(2);
    await dom(buttons.first()).toBeDisabled();
    await dom(buttons.last()).toBeDisabled();
    await noEvents();
    added.resolve(reaction(true, 5)); // POST #608 has no isLoggedIn field.
    for (const button of [buttons.first(), buttons.last()]) {
      await expectReaction(button, true, 5);
    }
    expect(await events(page)).toEqual([['reel_like', eventProps]]);
  });

  it('blocks clicks during a delayed saved-state read', async () => {
    const read = deferred<Reply>();
    const calls = await setup([read.promise]);
    await dom(like()).toBeDisabled();
    await like().evaluate((button) => (button as HTMLButtonElement).click());
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0]).toEqual({ url: '/api/reels/reel-1/like', method: 'GET' });
    read.resolve(reaction(true, 8, true));
    await expectReaction(like(), true, 8);
    await dom(like().locator('svg')).toHaveClass(/fill-red-500/);
    await noEvents();
  });

  it.each(['course-a', null])('deduplicates rapid clicks and confirms analytics (course=%s)', async (course_slug) => {
    const added = deferred<Reply>();
    const calls = await setup([reaction(false, 4, true), added.promise, reaction(false, 4)], { ...props, eventProps: { ...eventProps, course_slug } });
    await dom(like()).toBeEnabled();
    await like().dblclick();
    await expect.poll(() => calls.length).toBe(2);
    expect(calls[1]).toEqual({ url: '/api/reels/reel-1/like', method: 'POST' });
    await expectReaction(like(), false, 4);
    await noEvents();
    added.resolve(reaction(true, 5));
    await expectReaction(like(), true, 5);
    expect(await events(page)).toEqual([['reel_like', { ...eventProps, course_slug }]]);
    await like().click();
    await expectReaction(like(), false, 4);
    expect(methods(calls)).toEqual(['GET', 'POST', 'POST']);
    expect(await events(page)).toHaveLength(1);
  });

  it('recovers a lost POST response without a success event', async () => {
    const recovery = deferred<Reply>();
    const calls = await setup([reaction(false, 4, true), { abort: true }, recovery.promise]);
    await dom(like()).toBeEnabled();
    await like().click();
    await expect.poll(() => calls.length).toBe(3);
    await like().evaluate((button) => (button as HTMLButtonElement).click());
    expect(methods(calls)).toEqual(['GET', 'POST', 'GET']);
    await dom(like()).toHaveText('4');
    recovery.resolve(reaction(true, 5, true));
    await expectReaction(like(), true, 5);
    await dom(page.getByRole('status')).toContainText('Не удалось');
    await noEvents();
  });

  it('preserves state after POST and recovery GET fail', async () => {
    await setup([reaction(true, 8, true), { status: 500, body: {} },
      { abort: true }, reaction(true, 9, true)]);
    await dom(like()).toHaveText('8');
    await like().click();
    const retry = page.getByRole('button', { name: 'Повторить загрузку' });
    await dom(retry).toBeVisible();
    await expectReaction(like(), true, 8);
    await dom(like()).toBeDisabled();
    await retry.click();
    await dom(like()).toHaveText('9');
    await noEvents();
  });

  it('shows guest count and login without POST or analytics', async () => {
    const calls = await setup([reaction(false, 42, false)], { ...props, initialLikeCount: 42 });
    const login = page.getByRole('link', { name: 'Войти, чтобы поставить лайк' });
    await dom(login).toHaveAttribute('href', '/login');
    await dom(like()).toHaveCount(0);
    await dom(page.getByText('42', { exact: true })).toBeVisible();
    await login.evaluate((link) => link.addEventListener('click', (event) => event.preventDefault()));
    await login.click();
    expect(methods(calls)).toEqual(['GET']);
    await noEvents();
  });

  it.each([401, 429])('preserves count and analytics after HTTP %i', async (status) => {
    const calls = await setup([reaction(false, 4, true), { status, body: { error: 'rejected' } }]);
    await dom(like()).toBeEnabled();
    await like().click();
    await dom(page.getByRole('status')).toContainText(status === 401 ? 'Войдите' : 'Слишком много');
    await dom(page.getByText('4', { exact: true })).toBeVisible();
    if (status === 401) {
      await dom(page.getByRole('link', { name: 'Войти, чтобы поставить лайк' })).toHaveAttribute('href', '/login');
      await dom(like()).toHaveCount(0);
    } else {
      await dom(like()).toBeEnabled();
      await dom(like()).toHaveAttribute('aria-pressed', 'false');
    }
    expect(methods(calls)).toEqual(['GET', 'POST']);
    await noEvents();
  });

  it('aborts slow POST and ignores its late reply', async () => {
    const slow = deferred<Reply>();
    const calls = await setup([reaction(false, 4, true), slow.promise, reaction(false, 4, true)]);
    await dom(like()).toBeEnabled();
    await page.clock.install();
    await like().click();
    await expect.poll(() => calls.length).toBe(2);
    await page.clock.fastForward(10_001);
    await dom(page.getByRole('status')).toContainText('Не удалось');
    await dom(like()).toBeEnabled();
    slow.resolve(reaction(true, 99));
    await expectReaction(like(), false, 4);
    expect(methods(calls)).toEqual(['GET', 'POST', 'GET']);
    await noEvents();
  });

  it('aborts slow GET and permits retry', async () => {
    const slow = deferred<Reply>();
    const calls = await setup([slow.promise, reaction(true, 8, true)]);
    await page.clock.install();
    await expect.poll(() => calls.length).toBe(1);
    await page.clock.fastForward(10_001);
    await dom(like()).toHaveText('4');
    await dom(like()).toBeDisabled();
    await page.getByRole('button', { name: 'Повторить загрузку' }).click();
    await dom(like()).toHaveText('8');
    slow.resolve(reaction(false, 99, true));
    await dom(like()).toHaveAttribute('aria-pressed', 'true');
    await noEvents();
  });

  it('ignores the previous reel after navigation', async () => {
    const old = deferred<Reply>();
    const calls = await setup([old.promise, reaction(false, 12, true)]);
    await expect.poll(() => calls.length).toBe(1);
    await mount(page, kind, { eventProps: { ...eventProps, reel_id: 'second' } });
    await dom(like()).toHaveText('12');
    old.resolve(reaction(true, 99, true));
    await expectReaction(like(), false, 12);
    await noEvents();
  });

  it('does not emit a late success after unmount', async () => {
    const added = deferred<Reply>();
    const calls = await setup([reaction(false, 4, true), added.promise]);
    await dom(like()).toBeEnabled();
    await like().click();
    await expect.poll(() => calls.length).toBe(2);
    await unmount(page);
    const finished = page.waitForResponse((response) => response.request().method() === 'POST');
    added.resolve(reaction(true, 5));
    await finished;
    await dom(like()).toHaveCount(0);
    await noEvents();
  });

  it('rejects malformed success data without analytics', async () => {
    const calls = await setup([reaction(false, 4, true), reaction(true, -1), reaction(false, 4, true)]);
    await dom(like()).toBeEnabled();
    await like().click();
    await dom(page.getByRole('status')).toContainText('Не удалось');
    await expectReaction(like(), false, 4);
    expect(calls).toHaveLength(3);
    await noEvents();
  });
});

describe('old mounted reproduction from 5a75165', () => {
  it('exposes the former missing saved-state read', async () => {
    const calls = await setup([reaction(true, 8, true)], props, 'old');
    await dom(like()).toHaveText('4');
    expect(() => expect(calls).toHaveLength(1)).toThrow();
  });

  it('rejects old duplicate requests and premature analytics', async () => {
    const pending = deferred<Reply>();
    const calls = await setup([pending.promise, pending.promise], props, 'old');
    await like().dblclick();
    await expect.poll(() => calls.length).toBe(2);
    expect(() => expect(calls).toHaveLength(1)).toThrow();
    const captured = await events(page);
    expect(() => expect(captured).toEqual([])).toThrow();
    expect(captured).toHaveLength(2);
    pending.resolve(reaction(true, 5));
    await dom(like()).toHaveText('5');
  });
});
