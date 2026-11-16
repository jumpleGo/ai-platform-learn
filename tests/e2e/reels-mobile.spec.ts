import { test, expect, type Page } from '@playwright/test';

const SECTION = 'section[data-reel-id]';

// Id of the reel whose section fills the viewport (top edge within 40px of 0).
async function activeReelId(page: Page): Promise<string | null> {
  return page.evaluate((sel) => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      if (Math.abs(el.getBoundingClientRect().top) < 40) return el.dataset.reelId ?? null;
    }
    return null;
  }, SECTION);
}

test('reels feed on a phone: scroll two reels and share', async ({ page }) => {
  // Keep analytics clean: drop all PostHog traffic.
  await page.route(/posthog|\/ingest/, (route) => route.abort());
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: unknown) => {
        (window as unknown as { __shared: unknown[] }).__shared.push(data);
      },
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reels');
  await page.locator(SECTION).first().waitFor({ state: 'attached', timeout: 30_000 });
  const total = await page.locator(SECTION).count();
  expect(total).toBeGreaterThanOrEqual(3);

  const seen = [await activeReelId(page)];
  expect(seen[0]).not.toBeNull();
  for (let i = 1; i <= 2; i++) {
    await page.locator(SECTION).nth(i).evaluate((el) => el.scrollIntoView({ behavior: 'instant' as ScrollBehavior }));
    await expect.poll(() => activeReelId(page)).not.toBe(seen[i - 1]);
    seen.push(await activeReelId(page));
  }
  expect(new Set(seen).size).toBe(3);

  const active = page.locator(`${SECTION}[data-reel-id="${seen[2]}"]`);
  await active.getByRole('button', { name: 'Поделиться' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length))
    .toBe(1);
});
