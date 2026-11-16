/// <reference types="vite/client" />
import React, { useState } from 'react';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';
import { ReelPlayer, type ReelFeedItem } from '@/components/reels/reel-player';
import ReelsPage from '@/app/reels/page';
import type { Reel } from '@/lib/reels';
import oldPlayback from './fixtures/reels-mobile-playback-557.json';

// Frozen old fixture from baseline commit 516daec4f512a4039f4ea6fc03963674e720133e.
// The negative test case must fail assertions on this old baseline without querying git.
const OLD_REELS_BASELINE = {
  commit: '516daec4f512a4039f4ea6fc03963674e720133e',
  sourceSha256: 'ba896711582ba65caa4bfbaf1bde54f773c6ab3f66d67f1dfce73622e7859b32',
  markup: '<div class="flex min-h-svh flex-col bg-background"><header class="border-b border-border/70"><div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6"><a href="/" aria-label="GELATO, на главную"><span>GELATO</span></a><a href="/courses" class="text-sm font-medium text-muted-foreground hover:text-foreground">Курсы</a></div></header><main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10"><h1 class="mb-6 text-2xl font-bold tracking-tight sm:text-4xl">Короткие видео про ИИ</h1><div class="mx-auto grid max-w-md grid-cols-1 gap-8 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3"><article class="space-y-3"><video class="aspect-[9/16] w-full rounded-2xl bg-black object-cover" src="https://storage.googleapis.com/reels.test/video.mp4" poster="https://storage.googleapis.com/reels.test/poster.webp" preload="none" controls="" playsinline=""></video><h2 class="text-base font-semibold">Как задать ИИ понятный вопрос</h2><a href="/courses/claude-code-agents" class="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">Перейти в курс</a></article></div></main></div>',
  markupSha256: '6737279c2e173e2d25708ad6025ec805fb458864bbb9626d029306fd568d99f6',
};

const mocks = vi.hoisted(() => ({
  listPublishedReels: vi.fn(),
  bucket: vi.fn(),
  file: vi.fn(),
  sign: vi.fn(),
}));

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  return { ...actual, useState: vi.fn(actual.useState) };
});
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({
  adminStorage: { bucket: mocks.bucket },
  storageBucketName: 'reels.test',
}));
vi.mock('@/lib/db/reels', () => ({
  listPublishedReels: mocks.listPublishedReels,
}));
vi.mock('@/components/gelato-logo', () => ({
  GelatoLogo: () => <span>GELATO</span>,
}));

const mockReel1: Reel = {
  id: 'reel-1',
  title: 'Первое видео про агентов',
  courseSlug: 'claude-code-agents',
  videoPath: 'reels/reel-1/video.mp4',
  posterPath: 'reels/reel-1/poster.webp',
  order: 1,
  published: true,
};

const mockReel2: Reel = {
  id: 'reel-2',
  title: 'Второе видео про промпты',
  courseSlug: 'prompts-intro',
  videoPath: 'reels/reel-2/video.mp4',
  posterPath: 'reels/reel-2/poster.webp',
  order: 2,
  published: true,
};

const mockItems: ReelFeedItem[] = [
  {
    reel: mockReel1,
    video: 'https://storage.googleapis.com/reels.test/reel-1/video.mp4?signed=read',
    poster: 'https://storage.googleapis.com/reels.test/reel-1/poster.webp?signed=read',
  },
  {
    reel: mockReel2,
    video: 'https://storage.googleapis.com/reels.test/reel-2/video.mp4?signed=read',
    poster: 'https://storage.googleapis.com/reels.test/reel-2/poster.webp?signed=read',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('React', React);
  mocks.listPublishedReels.mockResolvedValue([mockReel1, mockReel2]);
  mocks.bucket.mockReturnValue({ file: mocks.file });
  mocks.file.mockImplementation((path: string) => ({
    getSignedUrl: (options: unknown) => mocks.sign(path, options),
  }));
  mocks.sign.mockImplementation(async (path: string) => [
    `https://storage.googleapis.com/reels.test/${path}?signed=read`,
  ]);
});

afterEach(() => {
  vi.mocked(useState).mockReset();
  vi.unstubAllGlobals();
});

function assertNoMobileVideos(html: string) {
  expect(html.match(/<video\b[^>]*>/g) ?? []).toHaveLength(0);
}

function assertDeferredVideo(video: string) {
  expect(video).toContain('preload="none"');
  expect(video).not.toMatch(/\bautoplay\b/i);
}

function renderOpenedMobileFeed(feed: React.ReactNode = <ReelsMobileFeed items={mockItems} />) {
  // Only the layout/overlay checks supply the post-viewport isMobile state.
  // Initial-render checks below use real state; no DOM or playback is simulated.
  vi.mocked(useState).mockReturnValueOnce([true, vi.fn()]);
  return renderToStaticMarkup(feed);
}

export function assertMobileFeedContract(html: string) {
  // 1. Mobile feed container with 100dvh and vertical scroll snap
  expect(html).toContain('100dvh');
  expect(html).toMatch(/\bsnap-y\b/);
  expect(html).toMatch(/\bsnap-mandatory\b/);

  // 2. Playback starts in the viewport-aware effect, never through HTML autoplay.
  const videos = html.match(/<video\b[^>]*>/g) ?? [];
  expect(videos).toHaveLength(mockItems.length);
  for (const video of videos) {
    assertDeferredVideo(video);
    expect(video).toMatch(/\bmuted\b/i);
  }

  // 3. Stub buttons over video: like and share with aria-labels
  expect(html).toMatch(/aria-label="[^"]*лайк[^"]*"/i);
  expect(html).toMatch(/aria-label="[^"]*поделиться[^"]*"/i);

  // 4. Sound toggle button
  expect(html).toMatch(/aria-label="[^"]*звук[^"]*"/i);

  // 5. Course CTA button linking to course
  expect(html).toMatch(/href="\/courses\/[a-z0-9-]+"[^>]*>[\s\S]*?К курсу/);
}

describe('mobile reels feed (#557)', () => {
  it('renders reels in a 100dvh snap-scroll container with one reel per snap', () => {
    const html = renderOpenedMobileFeed();

    expect(html).toContain('100dvh');
    expect(html).toMatch(/\bsnap-y\b/);
    expect(html).toMatch(/\bsnap-mandatory\b/);
    expect(html).toMatch(/\boverflow-y-scroll\b/);

    const sections = html.match(/<section\b[\s\S]*?<\/section>/g) ?? [];
    expect(sections).toHaveLength(2);
    for (const section of sections) {
      expect(section).toContain('100dvh');
      expect(section).toContain('snap-start');
    }
  });

  it('renders no mobile video in server markup', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToStaticMarkup(<ReelsMobileFeed items={mockItems} />);

    assertNoMobileVideos(html);
    expect(html).toContain(`src="${mockItems[0].poster}"`);
    expect(html).toContain(mockReel1.title);
    expect(html).toContain('data-reel-placeholder="reel-1"');
    expect(html).not.toContain(mockReel2.title);
  });

  it.each([390, 1280])('renders no mobile video before effects at a %i px viewport', (width) => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(max-width: 767px)' && width <= 767,
    }));
    vi.stubGlobal('window', { innerWidth: width, matchMedia });

    // Node renders the initial state with browser globals, without mounting a DOM.
    const html = renderToString(<ReelsMobileFeed items={mockItems} />);

    assertNoMobileVideos(html);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it.each([true, false])('keeps inactive reels unloaded without autoplay (muted=%s)', (isMuted) => {
    const html = renderToStaticMarkup(
      <ReelPlayer
        item={mockItems[1]}
        isActive={false}
        isMuted={isMuted}
        onToggleSound={() => {}}
        prefersReducedMotion={false}
      />
    );

    const videos = html.match(/<video\b[^>]*>/g) ?? [];
    expect(videos).toHaveLength(1);
    expect(videos[0]).toBeDefined();
    assertDeferredVideo(videos[0]!);
    expect(/\bmuted\b/i.test(videos[0]!)).toBe(isMuted);
  });

  it('leaves active reel playback to the client effect instead of HTML autoplay', () => {
    const html = renderToStaticMarkup(
      <ReelPlayer
        item={mockItems[0]}
        isActive={true}
        isMuted={true}
        onToggleSound={() => {}}
        prefersReducedMotion={false}
      />
    );

    const videos = html.match(/<video\b[^>]*>/g) ?? [];
    expect(videos).toHaveLength(1);
    expect(videos[0]).toBeDefined();
    assertDeferredVideo(videos[0]!);
    expect(videos[0]!).toMatch(/\bmuted\b/i);
  });

  it('disables autoplay on the active reel when prefers-reduced-motion is true', () => {
    const html = renderToStaticMarkup(
      <ReelPlayer
        item={mockItems[0]}
        isActive={true}
        isMuted={true}
        onToggleSound={() => {}}
        prefersReducedMotion={true}
      />
    );

    const video = html.match(/<video\b[^>]*>/)?.[0];
    expect(video).toBeDefined();
    expect(video).not.toMatch(/\bautoplay\b/i);
    expect(video).toMatch(/\bmuted\b/i);
  });

  it('renders interactive overlays: like, share, sound, course CTA, and poster', () => {
    const html = renderOpenedMobileFeed();

    // Poster is present before playback starts
    expect(html).toContain(`poster="${mockItems[0].poster}"`);

    // Like stub button
    expect(html).toMatch(/<button[^>]*aria-label="Лайк"[^>]*>/i);

    // Share stub button
    expect(html).toMatch(/<button[^>]*aria-label="Поделиться"[^>]*>/i);

    // Sound button
    expect(html).toMatch(/<button[^>]*aria-label="(Включить|Выключить) звук"[^>]*>/i);

    // Course CTA button and title
    expect(html).toContain('Первое видео про агентов');
    expect(html).toContain('Второе видео про промпты');
    expect(html).toMatch(/href="\/courses\/claude-code-agents"[^>]*>[\s\S]*?К курсу/);
    expect(html).toMatch(/href="\/courses\/prompts-intro"[^>]*>[\s\S]*?К курсу/);
  });

  it('renders mobile feed on /reels page alongside preserved computer view', async () => {
    const page = await ReelsPage();
    const html = renderToStaticMarkup(page);

    // The page passes its signed items to the mobile feed, which opens after mount.
    const mobileFeed = React.Children.toArray(page.props.children).find(
      (child) => React.isValidElement(child) && child.type === ReelsMobileFeed
    );
    expect(mobileFeed).toBeDefined();
    assertMobileFeedContract(renderOpenedMobileFeed(mobileFeed));

    // Computer view is preserved with snap feed and desktop articles (#618)
    expect(html).toMatch(/\bmd:flex\b|\bmd:grid\b/);
    expect(html).toContain('snap-y');
    expect(html).toContain('snap-mandatory');
    expect(html).toContain('Короткие видео про ИИ');
    const articles = html.match(/<article\b[\s\S]*?<\/article>/g) ?? [];
    expect(articles).toHaveLength(2);
    for (const [index, article] of articles.entries()) {
      expect(article).toContain(`data-reel-id="${mockItems[index]!.reel.id}"`);
      expect(article).toContain('Перейти в курс');
      const videos = article.match(/<video\b[^>]*>/g) ?? [];
      expect(videos).toHaveLength(1);
      expect(videos[0]).toBeDefined();
      assertDeferredVideo(videos[0]!);
      expect(videos[0]!).toMatch(/\bcontrols=/i);
      expect(videos[0]!).toMatch(/\bplaysinline=/i);
    }
    // Only the manual desktop players are present in the complete server page.
    expect(html.match(/<video\b/g) ?? []).toHaveLength(articles.length);
    // IDs identify desktop articles; mobile player sections still mount only on the client.
    expect(html.replace(/<article\b[\s\S]*?<\/article>/g, '')).not.toContain('data-reel-id=');
  });

  it('rejects the frozen b7963655 playback baseline with the new assertions', () => {
    expect(oldPlayback.courseSlugs).toEqual(mockItems.map(({ reel }) => reel.courseSlug));
    expect(createHash('sha256').update(oldPlayback.videoTags.join('\n')).digest('hex'))
      .toBe(oldPlayback.videoTagsSha256);

    expect(() => assertNoMobileVideos(oldPlayback.videoTags.join(''))).toThrow();
    expect(() => assertDeferredVideo(oldPlayback.videoTags[0]!)).toThrow();
  });

  it('rejects the frozen old page baseline with the same mobile feed assertion', () => {
    expect(
      createHash('sha256')
        .update(OLD_REELS_BASELINE.markup)
        .digest('hex')
    ).toBe(OLD_REELS_BASELINE.markupSha256);

    let oldFails = 0;
    try {
      assertMobileFeedContract(OLD_REELS_BASELINE.markup);
    } catch {
      oldFails++;
    }

    process.stdout.write(`OLD_FAILS=${oldFails}\n`);
    expect(oldFails).toBe(1);
  });
});
