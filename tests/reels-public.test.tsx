/// <reference types="vite/client" />
import React from 'react';
import type { Metadata } from 'next';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import { proxy } from '@/proxy';
import type { Reel } from '@/lib/reels';
import { SITE_URL } from '@/lib/site';

const mocks = vi.hoisted(() => ({
  readReels: vi.fn(), readCourses: vi.fn(), queryReels: vi.fn(), queryCourses: vi.fn(),
  bucket: vi.fn(), file: vi.fn(), sign: vi.fn(), catalog: vi.fn(), session: vi.fn(),
}));
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'reels') return { where: mocks.queryReels };
      if (name === 'courses') return { where: mocks.queryCourses };
      throw new Error(`Unexpected collection: ${name}`);
    },
  },
  adminStorage: { bucket: mocks.bucket },
  storageBucketName: 'reels-review.test',
}));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: mocks.catalog }));
vi.mock('@/lib/session', () => ({ getSession: mocks.session }));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));

// An absent route fails assertions on the old code rather than test collection.
// This suite loads only the current checkout; it never reads another Git ref.
const pages = import.meta.glob('../src/app/reels/page.tsx', { eager: true });
const pageModule = Object.values(pages)[0] as {
  default: () => Promise<React.ReactNode>;
  metadata: Metadata;
} | undefined;
const document = (id: string, data: object) => ({ id, data: () => data });
const published: Reel = {
  id: 'published-1', title: 'Как задать ИИ понятный вопрос', courseSlug: 'claude-code-agents',
  videoPath: 'reels/published-1/123e4567-e89b-42d3-a456-426614174000.mp4',
  posterPath: 'reels/published-1/poster.webp', order: 0, published: true,
};
const signedUrl = (path: string) => `https://storage.googleapis.com/reels-review.test/${encodeURIComponent(path)}?signed=read`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryReels.mockReturnValue({ get: mocks.readReels });
  mocks.queryCourses.mockReturnValue({ get: mocks.readCourses });
  mocks.readReels.mockResolvedValue({ docs: [] });
  mocks.readCourses.mockResolvedValue({ docs: [document('course-1', {
    slug: published.courseSlug, published: true,
  })] });
  mocks.catalog.mockResolvedValue([]);
  mocks.bucket.mockReturnValue({ file: mocks.file });
  mocks.file.mockImplementation((path: string) => ({
    getSignedUrl: (options: unknown) => mocks.sign(path, options),
  }));
  mocks.sign.mockImplementation(async (path: string) => [signedUrl(path)]);
  mocks.session.mockImplementation(() => { throw new Error('The feed must not require a session'); });
});

async function renderFeed() {
  expect(pageModule, 'Public /reels page is missing').toBeDefined();
  return renderToStaticMarkup(await pageModule!.default());
}

describe('public reels feed', () => {
  it('explains an empty feed to a newcomer and offers the course catalog', async () => {
    const html = await renderFeed();
    expect(html).toContain('Первые короткие видео скоро появятся');
    expect(html).toContain('познакомиться с ИИ');
    expect(html).toContain('href="/courses"');
    expect(html).not.toContain('<video');
    expect(mocks.bucket).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it('keeps a feed containing only drafts empty and never signs their files', async () => {
    mocks.readReels.mockResolvedValue({ docs: [document('draft', {
      ...published, title: 'PRIVATE_DRAFT_TITLE', published: false,
    })] });
    const html = await renderFeed();
    expect(html).toContain('Первые короткие видео скоро появятся');
    expect(html).not.toContain('PRIVATE_DRAFT_TITLE');
    expect(html).not.toContain('<video');
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('renders only playable published reels linked to a published course', async () => {
    mocks.readReels.mockResolvedValue({ docs: [
      document('second', { ...published, title: 'Второе видео', order: 2, posterPath: undefined }),
      document(published.id, published),
      document('draft', { ...published, title: 'PRIVATE_DRAFT_TITLE', published: false }),
      document('missing-video', { ...published, title: 'NO_VIDEO_TITLE', videoPath: '' }),
      document('retired', { ...published, title: 'RETIRED_COURSE_TITLE', courseSlug: 'retired' }),
    ] });
    const html = await renderFeed();
    expect(html).toContain(published.title);
    expect(html.indexOf(published.title)).toBeLessThan(html.indexOf('Второе видео'));
    expect(html).not.toMatch(/PRIVATE_DRAFT_TITLE|NO_VIDEO_TITLE|RETIRED_COURSE_TITLE/);
    const articles = html.match(/<article\b[\s\S]*?<\/article>/g) ?? [];
    expect(articles).toHaveLength(2);
    for (const article of articles) {
      expect(article).toContain('href="/courses/claude-code-agents"');
    }
    expect(mocks.queryReels).toHaveBeenCalledWith('published', '==', true);
    expect(mocks.queryCourses).toHaveBeenCalledWith('published', '==', true);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it('uses signed Storage video and poster URLs with manual inline playback', async () => {
    mocks.readReels.mockResolvedValue({ docs: [document(published.id, published)] });
    const html = await renderFeed();
    const video = html.match(/<video\b[^>]*>/)?.[0];
    expect(video).toBeDefined();
    expect(video).toContain(`src="${signedUrl(published.videoPath)}"`);
    expect(video).toContain(`poster="${signedUrl(published.posterPath!)}"`);
    expect(video).toContain('preload="none"');
    expect(video).toMatch(/\bcontrols=/i);
    expect(video).toMatch(/\bplaysinline=/i);
    expect(video).not.toMatch(/\bautoplay/i);
    for (const [, options] of mocks.sign.mock.calls) {
      expect(options.action).toBe('read');
      expect(new Date(options.expires).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('shows a poster even when the optional Storage poster is absent', async () => {
    mocks.readReels.mockResolvedValue({ docs: [document(published.id, {
      ...published, posterPath: undefined,
    })] });
    const html = await renderFeed();
    expect(html.match(/<video\b[^>]*>/)?.[0]).toMatch(/poster="[^\"]+"/);
    expect(mocks.sign).toHaveBeenCalledTimes(1);
  });

  it('has a concise search title, one-sentence description and /reels canonical', () => {
    expect(pageModule, 'Public /reels page is missing').toBeDefined();
    const { metadata } = pageModule!;
    expect(typeof metadata.title).toBe('string');
    expect(String(metadata.title).length).toBeGreaterThan(0);
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(metadata.description).toMatch(/ИИ/);
    expect(metadata.description?.split(/[.!?]+/).filter((part) => part.trim())).toHaveLength(1);
    expect(metadata.alternates?.canonical).toBe('/reels');
  });

  it('includes /reels exactly once in the sitemap even with an empty catalog', async () => {
    const urls = (await sitemap()).filter((entry) => entry.url === `${SITE_URL}/reels`);
    expect(urls).toHaveLength(1);
  });

  it.each(['/reels', '/reels/', '/reels?utm_source=search'])('allows a guest to open %s', (path) => {
    const response = proxy(new NextRequest(`${SITE_URL}${path}`, {
      headers: { cookie: 'vid=reels-review-464' },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it.each(['/admin', '/admin/reels', '/reels/private', '/reels-private'])('preserves the guest gate for %s', (path) => {
    const response = proxy(new NextRequest(`${SITE_URL}${path}`, {
      headers: { cookie: 'vid=reels-review-464' },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/login`);
  });
});
