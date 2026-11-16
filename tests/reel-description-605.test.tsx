import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReelPage, { generateMetadata } from '@/app/reels/[id]/page';
import { listPublishedReels } from '@/lib/db/reels';
import type { Reel } from '@/lib/reels';
import { SITE_URL } from '@/lib/site';
import fixture from './fixtures/reel-description-605.json';

const mocks = vi.hoisted(() => ({ reels: vi.fn(), courses: vi.fn() }));
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
// Exercise the real database projection and normalization with in-memory data.
// No Admin SDK initialization, credentials, network requests or database writes.
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'reels') return { where: () => ({ get: mocks.reels }) };
      if (name === 'courses') return { where: () => ({ get: mocks.courses }) };
      throw new Error(`Unexpected collection: ${name}`);
    },
  },
  adminStorage: {
    bucket: () => ({
      file: () => ({ getMetadata: async () => [{ timeCreated: '2026-11-15T07:13:29.108Z' }] }),
    }),
  },
  storageBucketName: 'reel-description-605.test',
}));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));

// Frozen minimal fixture: old source hash/commit and course slugs are recorded
// alongside the observed reel. This suite never reads Git or origin at runtime.
const approved = 'Онлайн-школа GELATO: обучение работе с ИИ. Новичкам — можно с нуля.';
const course = { slug: fixture.slugs[0], title: 'Курс', description: '', published: true };
const intro: Reel = {
  ...fixture.reel,
  courseSlug: course.slug,
  videoPath: `reels/${fixture.reel.id}/video.mp4`,
  published: true,
  order: 1,
};
const otherId = '0123456789abcdefghij';
const doc = (id: string, data: object) => ({ id, data: () => data });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reels.mockResolvedValue({ docs: [doc(intro.id, intro)] });
  mocks.courses.mockResolvedValue({ docs: [doc('course-1', course)] });
});

async function expectDescription(id: string, description: string) {
  const props = { params: Promise.resolve({ id }) };
  const reels = await listPublishedReels();
  expect(reels.find((reel) => reel.id === id)?.description).toBe(description);

  const metadata = await generateMetadata(props);
  expect(metadata.description).toBe(description);
  expect(metadata.openGraph).toMatchObject({ description, url: `${SITE_URL}/reels/${id}` });
  expect(metadata.twitter).toMatchObject({ description });
  expect(metadata.alternates?.canonical).toBe(`/reels/${id}`);

  // Resolve the server function before rendering its synchronous React tree.
  const html = renderToStaticMarkup(await ReelPage(props));
  expect(html).toContain('>Знакомство</h1>');
  const paragraph = html.match(/<p\b[^>]*>([^<]*)<\/p>/)?.[1];
  expect(paragraph).toBe(description || undefined);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  expect(json).toBeDefined();
  expect(JSON.parse(json!)).toMatchObject({
    '@type': 'VideoObject', description, url: `${SITE_URL}/reels/${id}`,
    contentUrl: `${SITE_URL}/reels/${id}/video`,
  });
}

describe('approved introduction description #605', () => {
  it.each(['', undefined, ' \n\t '])('fills an empty stored description (%j) on the page and in metadata', async (description) => {
    mocks.reels.mockResolvedValue({ docs: [doc(intro.id, { ...intro, description })] });
    await expectDescription(intro.id, approved);
  });

  it.each([intro.id, otherId])('preserves the stored description for %s everywhere', async (id) => {
    const description = 'Собственное описание ролика.';
    mocks.reels.mockResolvedValue({ docs: [doc(id, { ...intro, id, description })] });
    await expectDescription(id, description);
  });

  it('prefers the approved reel copy to a generic course description', async () => {
    mocks.courses.mockResolvedValue({ docs: [doc('course-1', { ...course, description: 'Описание курса.' })] });
    await expectDescription(intro.id, approved);
  });

  it.each(['Описание курса.', ''])('keeps the existing course fallback (%j) for another ID with the same title', async (description) => {
    mocks.reels.mockResolvedValue({ docs: [doc(otherId, { ...intro, id: otherId })] });
    mocks.courses.mockResolvedValue({ docs: [doc('course-1', { ...course, description })] });
    await expectDescription(otherId, description);
  });
});
