import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/(app)/(home)/page';
import { GET as llms } from '@/app/llms.txt/route';
import { SiteFooter } from '@/components/site-footer';
import { SiteNavDesktop, SiteNavMobile } from '@/components/site-nav';
import type { Reel } from '@/lib/reels';

const mocks = vi.hoisted(() => ({ listPublishedReels: vi.fn(), menuOpen: true }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: mocks.listPublishedReels }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({ default: (props: React.ComponentProps<'a'>) => <a {...props} /> }));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));
vi.mock('@/components/home-variant-analytics', () => ({ HomeVariantAnalytics: () => null }));
vi.mock('@/components/promo-banner', () => ({ PromoBanner: () => null }));
vi.mock('@/components/student-link', () => ({ StudentLink: () => null }));
// Render the actual mobile panel in its open state, without a browser dependency.
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: () => [mocks.menuOpen, vi.fn()],
  useEffect: vi.fn(),
}));

const reel: Reel = {
  id: 'published-1', title: 'Как работать с ИИ', courseSlug: 'claude-code-agents',
  videoPath: 'reels/published-1/video.mp4', published: true, order: 0,
};
const feedLinks = (html: string) => html.match(/\bhref="\/reels"/g) ?? [];

afterEach(() => vi.unstubAllGlobals());

describe.each([
  { state: 'empty', visible: false },
  { state: 'error', visible: false },
  { state: 'published', visible: true },
])('reels discovery with $state data', ({ state, visible }) => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
    mocks.menuOpen = true;
    mocks.listPublishedReels.mockReset();
    if (state === 'error') mocks.listPublishedReels.mockRejectedValue(new Error('Firestore unavailable'));
    else mocks.listPublishedReels.mockResolvedValue(state === 'published' ? [reel] : []);
  });

  it('shows the footer link only for a nonempty published feed', async () => {
    const html = renderToStaticMarkup(await SiteFooter());
    expect(feedLinks(html)).toHaveLength(visible ? 1 : 0);
    expect(html).toContain('href="/blog"');
    expect(html).toContain('href="/courses"');
  });

  it.each([false, true])('gates the desktop menu for authed=%s', async (authed) => {
    const html = renderToStaticMarkup(await SiteNavDesktop({ authed }));
    expect(feedLinks(html)).toHaveLength(visible ? 1 : 0);
    expect(html.includes('Короткие видео')).toBe(visible);
    expect(html.includes('href="/#learning"')).toBe(authed);
  });

  it.each([false, true])('gates the open mobile menu for authed=%s', async (authed) => {
    const html = renderToStaticMarkup(await SiteNavMobile({ authed, children: <span>Аккаунт</span> }));
    expect(html).toContain('aria-expanded="true"');
    expect(feedLinks(html)).toHaveLength(visible ? 1 : 0);
    expect(html.includes('Короткие видео')).toBe(visible);
    expect(html.includes('href="/#learning"')).toBe(authed);
    expect(html).toContain('Аккаунт');
  });

  it('gates the home link beside the existing hero buttons', async () => {
    const html = renderToStaticMarkup(await HomePage());
    const hero = html.match(/<section\b[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(hero).toContain('href="/courses"');
    expect(hero).toContain('href="/free"');
    expect(feedLinks(hero)).toHaveLength(visible ? 1 : 0);
    expect(feedLinks(html)).toHaveLength(visible ? 1 : 0);
    expect(hero.includes('Короткие видео')).toBe(visible);
  });

  it('gates the llms.txt feed entry without losing other sections', async () => {
    const response = await llms();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const text = await response.text();
    const links = text.split('\n').filter((line) => line.includes('https://gelato.education/reels'));
    expect(links).toHaveLength(visible ? 1 : 0);
    if (visible) expect(links[0]).toContain('[Короткие видео](https://gelato.education/reels)');
    expect(text).toContain('[Главная](https://gelato.education/)');
    expect(text).toContain('[Блог](https://gelato.education/blog)');
  });
});
