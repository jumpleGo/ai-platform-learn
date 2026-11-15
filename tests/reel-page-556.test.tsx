/// <reference types="vite/client" />
import React from 'react';
import type { Metadata } from 'next';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import { proxy } from '@/proxy';
import { normalizeReel, type Reel } from '@/lib/reels';
import { SITE_URL } from '@/lib/site';

const mocks = vi.hoisted(() => ({
  reels: vi.fn(), courses: vi.fn(), queryReels: vi.fn(), queryCourses: vi.fn(),
  bucket: vi.fn(), file: vi.fn(), sign: vi.fn(), fileMetadata: vi.fn(), catalog: vi.fn(),
}));
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: (name: string) => {
    if (name === 'reels') return { where: mocks.queryReels };
    if (name === 'courses') return { where: mocks.queryCourses };
    throw new Error(`Unexpected collection: ${name}`);
  } },
  adminStorage: { bucket: mocks.bucket }, storageBucketName: 'reels-review.test',
}));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: mocks.catalog }));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));

// Load the current checkout only. An absent route is an assertion failure,
// so this exact suite can also run before the implementation exists.
const pages = import.meta.glob('../src/app/reels/*/page.tsx', { eager: true });
type Props = { params: Promise<{ id: string }> };
const page = Object.values(pages)[0] as {
  default: (props: Props) => Promise<React.ReactNode>;
  generateMetadata: (props: Props) => Promise<Metadata>;
} | undefined;
const doc = (id: string, data: object) => ({ id, data: () => data });
const course = {
  slug: 'claude-code-agents', title: 'Claude Code с нуля',
  description: 'Учимся работать с ИИ на практике.', published: true,
};
const reel: Reel = {
  id: 'published-556', title: ' Понятный вопрос для ИИ ',
  description: ' Как объяснить задачу помощнику. ', courseSlug: course.slug,
  videoPath: 'reels/published-556/video.mp4', posterPath: 'reels/published-556/poster.webp',
  published: true, order: 0,
};
const uploadDate = '2026-11-10T08:30:00.000Z';
const signedUrl = (path: string) => `https://storage.googleapis.com/reels-review.test/${path}?signed=read`;
const props = (id = reel.id): Props => ({ params: Promise.resolve({ id }) });
const guest = (path: string) => new NextRequest(`${SITE_URL}${path}`, {
  headers: { cookie: 'vid=reel-page-556' },
});
function requirePage() {
  expect(page, 'The /reels/[id] page is missing').toBeDefined();
  return page!;
}
async function render(id = reel.id) {
  return renderToStaticMarkup(await requirePage().default(props(id)));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryReels.mockReturnValue({ get: mocks.reels });
  mocks.queryCourses.mockReturnValue({ get: mocks.courses });
  mocks.reels.mockResolvedValue({ docs: [doc(reel.id, reel)] });
  mocks.courses.mockResolvedValue({ docs: [doc('course-1', course)] });
  mocks.catalog.mockResolvedValue([]);
  mocks.bucket.mockReturnValue({ file: mocks.file });
  mocks.file.mockImplementation((path: string) => ({
    getSignedUrl: (options: unknown) => mocks.sign(path, options),
    getMetadata: () => mocks.fileMetadata(path),
  }));
  mocks.sign.mockImplementation(async (path: string) => [signedUrl(path)]);
  mocks.fileMetadata.mockResolvedValue([{ timeCreated: uploadDate }]);
});

describe('individual public reel #556', () => {
  it('uses normalized text, its own canonical and social preview', async () => {
    const normalized = normalizeReel(reel, course);
    const metadata = await requirePage().generateMetadata(props());
    expect(metadata.title).toBe(normalized.title);
    expect(metadata.description).toBe(normalized.description);
    expect(metadata.alternates?.canonical).toBe(`/reels/${reel.id}`);
    expect(metadata.openGraph).toMatchObject({
      title: normalized.title, description: normalized.description,
      url: `${SITE_URL}/reels/${reel.id}`,
      images: [expect.objectContaining({ url: signedUrl(reel.posterPath!) })],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image', title: normalized.title,
      description: normalized.description, images: [signedUrl(reel.posterPath!)],
    });
  });

  it('uses course defaults and a raster social image for a legacy reel', async () => {
    mocks.reels.mockResolvedValue({ docs: [doc(reel.id, {
      ...reel, title: undefined, description: undefined, posterPath: undefined,
    })] });
    const metadata = await requirePage().generateMetadata(props());
    expect(metadata.title).toBe(course.title);
    expect(metadata.description).toBe(course.description);
    expect(metadata.twitter).toMatchObject({ images: [`${SITE_URL}/og-gelato.png`] });
  });

  it('renders VideoObject with the real upload date and playable video plus a course link', async () => {
    const html = await render();
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(json).toBeDefined();
    expect(JSON.parse(json!)).toMatchObject({
      '@context': 'https://schema.org', '@type': 'VideoObject',
      name: normalizeReel(reel, course).title, description: normalizeReel(reel, course).description,
      thumbnailUrl: signedUrl(reel.posterPath!), uploadDate, contentUrl: signedUrl(reel.videoPath),
    });
    expect(mocks.fileMetadata).toHaveBeenCalledWith(reel.videoPath);
    expect(html).toContain(`src="${signedUrl(reel.videoPath)}"`);
    expect(html).toContain(`href="/courses/${course.slug}"`);
    expect(html).toContain('Поделиться');
    expect(html).toMatch(/<video\b[^>]*controls=""[^>]*playsInline=""/i);
  });

  it('escapes markup in JSON-LD without changing its text', async () => {
    const title = '</script><script>alert(1)</script>';
    mocks.reels.mockResolvedValue({ docs: [doc(reel.id, { ...reel, title })] });
    const html = await render();
    expect(html).not.toContain(title);
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(JSON.parse(json!).name).toBe(title);
  });

  it.each(['draft', 'missing', 'no-video', 'retired-course'])('returns notFound for %s in page and metadata, without signing media', async (kind) => {
    const data = { ...reel, published: kind !== 'draft',
      videoPath: kind === 'no-video' ? '' : reel.videoPath,
      courseSlug: kind === 'retired-course' ? 'retired' : course.slug };
    mocks.reels.mockResolvedValue({ docs: kind === 'missing' ? [] : [doc(reel.id, data)] });
    const route = requirePage();
    await expect(route.default(props())).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(route.generateMetadata(props())).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.fileMetadata).not.toHaveBeenCalled();
  });

  it.each([`/reels/${reel.id}`, `/reels/${reel.id}/`, `/reels/${reel.id}?utm_source=share`])('lets a guest open published %s', async (path) => {
    const response = await proxy(guest(path));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
    expect(mocks.queryReels).toHaveBeenCalledWith('published', '==', true);
    expect(mocks.queryCourses).toHaveBeenCalledWith('published', '==', true);
  });

  it.each(['draft', 'missing', 'no-video', 'retired-course'])('keeps guest access closed for %s', async (kind) => {
    mocks.reels.mockResolvedValue({ docs: kind === 'missing' ? [] : [doc(reel.id, {
      ...reel, published: kind !== 'draft', videoPath: kind === 'no-video' ? '' : reel.videoPath,
      courseSlug: kind === 'retired-course' ? 'retired' : course.slug,
    })] });
    const response = await proxy(guest(`/reels/${reel.id}`));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/login`);
  });

  it.each([`/reels/${reel.id}/edit`, `/reels/${reel.id}/private/more`, '/reels-private', '/admin/reels'])('preserves the guest gate on %s', async (path) => {
    const response = await proxy(guest(path));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/login`);
    expect(mocks.reels).not.toHaveBeenCalled();
  });

  it('appends only published playable reels to the unchanged sitemap entries', async () => {
    mocks.reels.mockResolvedValue({ docs: [] });
    const before = await sitemap();
    mocks.reels.mockResolvedValue({ docs: [
      doc(reel.id, reel), doc('draft', { ...reel, published: false }),
      doc('empty', { ...reel, videoPath: '' }), doc('retired', { ...reel, courseSlug: 'retired' }),
    ] });
    const after = await sitemap();
    expect(after.filter((entry) => entry.url !== `${SITE_URL}/reels/${reel.id}`)).toEqual(before);
    expect(after.filter((entry) => entry.url === `${SITE_URL}/reels/${reel.id}`)).toHaveLength(1);
    expect(after).toHaveLength(before.length + 1);
    expect(after.some((entry) => /\/reels\/(draft|empty|retired)$/.test(entry.url))).toBe(false);
  });
});
