import { expect as dom, type Page } from '@playwright/test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReelBrowser, mount, reaction, routeLikes } from './fixtures/reel-actions-5a75165';

type TestReelWindow = {
  reels: Array<{
    id: string;
    title: string;
    description?: string;
    courseSlug: string;
    videoPath: string;
    order: number;
    published: boolean;
    likeCount: number;
  }>;
};

const mockReel = {
  id: 'desktop-reel-618',
  title: 'Ролик про ИИ на десктопе',
  description: 'Как использовать ИИ для автоматизации задач.',
  courseSlug: 'claude-code-agents',
  videoPath: 'video.mp4',
  order: 1,
  published: true,
  likeCount: 15,
};

let browser: Awaited<ReturnType<typeof createReelBrowser>>;
let page: Page;

beforeAll(async () => {
  browser = await createReelBrowser();
}, 30_000);

beforeEach(async () => {
  page = await browser.page(1024);
  await page.evaluate((data) => {
    const testWindow = window as unknown as TestReelWindow;
    testWindow.reels = [data];
  }, mockReel);
  await routeLikes(page, [reaction(false, mockReel.likeCount, true)]);
});

afterEach(async () => {
  await page?.close();
});

afterAll(async () => {
  await browser?.close();
});

describe('desktop reels feed layout (#618)', () => {
  it('renders snap-scroll feed on desktop with 9:16 video and right-side action/description column', async () => {
    await mount(page, 'page');

    // 1. Container has snap-y snap-mandatory
    const feedContainer = page.locator('[data-reel-feed="desktop"], main.snap-y');
    await dom(feedContainer).toBeVisible();
    await dom(feedContainer).toHaveClass(/snap-y/);
    await dom(feedContainer).toHaveClass(/snap-mandatory/);

    // 2. Reel article has snap-start snap-always
    const reelArticle = page.locator('article[data-reel-id="desktop-reel-618"], article.snap-start').first();
    await dom(reelArticle).toBeVisible();
    await dom(reelArticle).toHaveClass(/snap-start/);
    await dom(reelArticle).toHaveClass(/snap-always/);

    // 3. Video element is vertical 9:16
    const video = reelArticle.locator('video');
    await dom(video).toBeVisible();
    const videoContainer = reelArticle.locator('.aspect-\\[9\\/16\\]').first();
    await dom(videoContainer).toBeVisible();

    // 4. Right column containing Like, Share, and description block with course link
    const rightColumn = reelArticle.locator('[data-reel-column="right"]');
    await dom(rightColumn).toBeVisible();

    // Like button with like count
    const likeButton = rightColumn.getByRole('button', { name: 'Лайк' });
    await dom(likeButton).toBeVisible();
    await dom(likeButton).toContainText(String(mockReel.likeCount));

    // Share button
    const shareButton = rightColumn.getByRole('button', { name: 'Поделиться' });
    await dom(shareButton).toBeVisible();

    // Title and description
    await dom(rightColumn.getByText(mockReel.title)).toBeVisible();
    await dom(rightColumn.getByText(mockReel.description)).toBeVisible();

    // Course link
    const courseLink = rightColumn.getByRole('link', { name: 'Перейти в курс' });
    await dom(courseLink).toBeVisible();
    await dom(courseLink).toHaveAttribute('href', `/courses/${mockReel.courseSlug}`);

    // Geometry check: the right column is physically located to the right of the video
    const videoBox = await video.boundingBox();
    const colBox = await rightColumn.boundingBox();
    expect(videoBox).not.toBeNull();
    expect(colBox).not.toBeNull();
    expect(colBox!.x).toBeGreaterThanOrEqual(videoBox!.x + videoBox!.width - 1);
  }, 20_000);
});
