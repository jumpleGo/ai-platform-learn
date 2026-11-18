/// <reference types="vite/client" />
import React from 'react';
import type { Metadata } from 'next';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import { proxy } from '@/proxy';
import { SITE_URL } from '@/lib/site';
import type { Reel } from '@/lib/reels';

const mocks = vi.hoisted(() => ({
  reels: vi.fn(), courses: vi.fn(), file: vi.fn(), sign: vi.fn(), metadata: vi.fn(),
}));
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: (name: string) => ({
    where: () => ({ get: name === 'reels' ? mocks.reels : mocks.courses }),
  }) },
  adminStorage: { bucket: () => ({ file: mocks.file }) },
  storageBucketName: 'reels.test',
}));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));

type Props = { params: Promise<{ slug: string }> };
type PageModule = {
  default: (props: Props) => Promise<React.ReactNode>;
  generateMetadata: (props: Props) => Promise<Metadata>;
};
type MediaModule = { GET: (request: Request, props: Props) => Promise<Response> };
// The regression fails an assertion on the old checkout, where the route is absent.
const pages = import.meta.glob('../src/app/reels/*/page.tsx', { eager: true });
const videos = import.meta.glob('../src/app/reels/*/video/route.ts', { eager: true });
const posters = import.meta.glob('../src/app/reels/*/poster/route.ts', { eager: true });
const page = Object.values(pages)[0] as PageModule | undefined;
const video = Object.values(videos)[0] as MediaModule | undefined;
const poster = Object.values(posters)[0] as MediaModule | undefined;
const reel: Reel = {
  id: 'existing-reel-1', title: 'Как задать ИИ понятный вопрос', courseSlug: 'claude-code-agents',
  videoPath: 'reels/existing-reel-1/123e4567-e89b-42d3-a456-426614174000.mp4',
  posterPath: 'reels/existing-reel-1/poster.webp', order: 0, published: true,
};
const doc = (id: string, data: object) => ({ id, data: () => data });
const props = (slug = reel.id): Props => ({ params: Promise.resolve({ slug }) });
const url = `${SITE_URL}/reels/${reel.id}`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reels.mockResolvedValue({ docs: [doc(reel.id, reel)] });
  mocks.courses.mockResolvedValue({ docs: [doc('course', { slug: reel.courseSlug, published: true })] });
  mocks.metadata.mockResolvedValue([{ timeCreated: '2026-11-01T12:00:00.000Z' }]);
  mocks.file.mockImplementation((path: string) => ({
    getMetadata: mocks.metadata,
    getSignedUrl: (options: unknown) => mocks.sign(path, options),
  }));
  mocks.sign.mockImplementation(async (path: string) => [`https://storage.test/${encodeURIComponent(path)}?signed=read`]);
});

function requirePage(): PageModule {
  expect(page, 'Missing /reels/[slug] page').toBeDefined();
  return page!;
}
function schemaFrom(html: string) {
  const payloads = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return payloads.map((match) => JSON.parse(match[1])).find((schema) => schema['@type'] === 'VideoObject');
}

describe('individual reels #552', () => {
  it('returns per-reel metadata, canonical and a VideoObject in the rendered page', async () => {
    const route = requirePage();
    const metadata = await route.generateMetadata(props());
    expect(metadata.title).toContain(reel.title);
    expect(metadata.description).toContain(reel.title);
    expect(metadata.alternates?.canonical).toBe(url);
    expect(metadata.openGraph).toMatchObject({
      type: 'video.other', url,
      videos: [{ url: `${url}/video`, type: 'video/mp4' }],
      images: [{ url: `${url}/poster`, alt: reel.title }],
    });
    const html = renderToStaticMarkup(await route.default(props()));
    expect(schemaFrom(html)).toMatchObject({
      '@context': 'https://schema.org', '@type': 'VideoObject', name: reel.title,
      url, contentUrl: `${url}/video`, thumbnailUrl: `${url}/poster`,
      uploadDate: '2026-11-01T12:00:00.000Z',
    });
    expect(html).toContain(`src="${url}/video"`);
    expect(html).toContain('href="/reels"');
  });

  it('keeps the existing ID as the slug after a title change and escapes JSON-LD', async () => {
    const title = '</script><script>injected</script>';
    mocks.reels.mockResolvedValue({ docs: [doc(reel.id, { ...reel, title })] });
    const route = requirePage();
    expect((await route.generateMetadata(props())).alternates?.canonical).toBe(url);
    const html = renderToStaticMarkup(await route.default(props()));
    expect(html).not.toContain(title);
    expect(schemaFrom(html).name).toBe(title);
  });

  it('uses a public fallback preview and never invents an unknown upload date', async () => {
    mocks.reels.mockResolvedValue({ docs: [doc(reel.id, { ...reel, posterPath: undefined })] });
    mocks.metadata.mockRejectedValue(new Error('Storage metadata unavailable'));
    const schema = schemaFrom(renderToStaticMarkup(await requirePage().default(props())));
    expect(schema.thumbnailUrl).toBe(`${SITE_URL}/og-gelato.png`);
    expect(schema).not.toHaveProperty('uploadDate');
  });

  it.each([
    ['unknown', null], ['private', null], ['draft', { ...reel, published: false }],
    ['retired', { ...reel, courseSlug: 'retired' }], ['empty-video', { ...reel, videoPath: '' }],
  ])('returns 404 for %s instead of exposing the reel or its media', async (slug, data) => {
    mocks.reels.mockResolvedValue({ docs: data ? [doc(slug as string, data)] : [] });
    const route = requirePage();
    await expect(route.generateMetadata(props(slug as string))).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(route.default(props(slug as string))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(video, 'Missing stable video endpoint').toBeDefined();
    const response = await video!.GET(new Request(url), props(slug as string));
    expect(response.status).toBe(404);
    expect(mocks.file).not.toHaveBeenCalled();
  });

  it('refreshes signed media behind stable public URLs without caching the redirect', async () => {
    expect(video).toBeDefined();
    expect(poster).toBeDefined();
    for (const [route, path] of [[video!, reel.videoPath], [poster!, reel.posterPath!]] as const) {
      const response = await route.GET(new Request(url), props());
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain(encodeURIComponent(path));
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
    for (const [, options] of mocks.sign.mock.calls) {
      expect(options.action).toBe('read');
      expect(options.expires).toBeGreaterThan(Date.now());
    }
  });

  it('adds only playable published reel IDs to the sitemap', async () => {
    mocks.reels.mockResolvedValue({ docs: [
      doc(reel.id, reel), doc('draft', { ...reel, published: false }),
      doc('retired', { ...reel, courseSlug: 'retired' }),
      doc('empty-video', { ...reel, videoPath: '' }),
    ] });
    const entries = (await sitemap()).filter((entry) => entry.url.startsWith(`${SITE_URL}/reels/`));
    expect(entries.map((entry) => entry.url)).toEqual([url]);
  });

  it.each([`/reels/${reel.id}`, `/reels/${reel.id}/video`, `/reels/${reel.id}/poster`])(
    'allows guests to request the new public route %s', (path) => {
      const response = proxy(new NextRequest(`${SITE_URL}${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    },
  );
});
