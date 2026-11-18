import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import ReelPage from '@/app/reels/[id]/page';
import { createReelBrowser } from './fixtures/reel-actions-5a75165';
vi.stubGlobal('React', React);
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [{
  id: 'eo0EzK9gMElHYrrxDCSd', title: 'Ролик', videoPath: 'v', published: true, courseSlug: 'c', ctaHref: '/courses/c',
}] }));
vi.mock('@/lib/firebase/admin', () => ({ storageBucketName: 'test', adminStorage: {
  bucket: () => ({ file: () => ({ getMetadata: async () => [{}] }) }),
} }));
it('fullscreen detail', async () => {
  const html = renderToStaticMarkup(await ReelPage({ params: Promise.resolve({ id: 'eo0EzK9gMElHYrrxDCSd' }) }));
  const browser = await createReelBrowser();
  try {
    const page = await browser.page();
    await (await page.context().newCDPSession(page)).send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await page.evaluate(html => { document.getElementById('root')!.innerHTML = html; }, html);
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size);
      const box = await page.locator('[data-reel-placeholder], article video').filter({ visible: true }).boundingBox();
      expect(box?.height).toBe(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(size.height);
    }
  } finally { await browser.close(); }
}, 30_000);
