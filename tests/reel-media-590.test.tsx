import React from 'react';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReelPage, { generateMetadata } from '@/app/reels/[id]/page';
import { GET as poster, dynamic as posterDynamic } from '@/app/reels/[id]/poster/route';
import { GET as video, dynamic as videoDynamic } from '@/app/reels/[id]/video/route';
import { proxy } from '@/proxy';
import { normalizeReel } from '@/lib/reels';
import { SITE_URL } from '@/lib/site';
import old from './fixtures/reel-seo-556.json';

const mocks = vi.hoisted(() => ({ published: vi.fn(), bucket: vi.fn(), file: vi.fn(), sign: vi.fn(), metadata: vi.fn() }));
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: mocks.published }));
vi.mock('@/lib/firebase/admin', () => ({ adminStorage: { bucket: mocks.bucket }, storageBucketName: 'reels.test' }));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));

const reel = normalizeReel({
  id: 'eo0EzK9gMElHYrrxDCSd', title: 'Как задать вопрос', description: 'Практика с ИИ',
  courseSlug: 'claude-code-agents', videoPath: 'reels/video.mp4', posterPath: 'reels/poster.webp',
  published: true, order: 0,
}, { title: 'Claude Code' });
const url = `${SITE_URL}/reels/${reel.id}`;
const uploadDate = '2026-11-10T08:30:00.000Z';
const props = (id = reel.id) => ({ params: Promise.resolve({ id }) });
const guest = (path: string) => new NextRequest(`${SITE_URL}${path}`, { headers: { cookie: 'vid=reel-media-590' } });
const signature = /(?:[?&]|&amp;)(?:X-Goog-[^=]+|GoogleAccessId|Expires|Signature|X-Amz-[^=]+|AWSAccessKeyId|Policy|Key-Pair-Id|signed)=/i;
type Projection = { schema: Record<string, unknown>; openGraph: { images: { url: string }[] } };

// The same assertions run on rendered current output and executable, frozen #556 snippets.
function seoChecks({ schema, openGraph }: Projection) {
  return [
    () => { expect(String(schema.contentUrl)).not.toMatch(signature); expect(schema.contentUrl).toBe(`${url}/video`); },
    () => { expect(String(schema.thumbnailUrl)).not.toMatch(signature); expect(schema.thumbnailUrl).toBe(`${url}/poster`); },
    () => { expect(JSON.stringify(openGraph)).not.toMatch(signature); expect(openGraph.images).toEqual([expect.objectContaining({ url: `${url}/poster` })]); },
    () => { expect(schema.embedUrl).toBe(url); },
  ];
}

async function currentProjection(): Promise<Projection> {
  const html = renderToStaticMarkup(await ReelPage(props()));
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  expect(json).toBeDefined();
  expect(json).not.toMatch(signature);
  const metadata = await generateMetadata(props());
  expect(JSON.stringify(metadata.twitter)).not.toMatch(signature);
  return { schema: JSON.parse(json!), openGraph: metadata.openGraph as Projection['openGraph'] };
}

async function oldProjection(): Promise<Projection> {
  // Only the signing block and the two original field lists, with no Git reads at runtime.
  const source = `const { reel, adminStorage, storageBucketName, SITE_URL, uploadDate, url } = context;
    const LINK_TTL_MS = 60 * 60 * 1000;
    ${old.signing}
    return { schema: { ${old.videoObjectFields} }, openGraph: { ${old.openGraphImages} } };`;
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const execute = new Function('context', `return (async () => { ${compiled} })();`);
  return execute({ reel, adminStorage: { bucket: mocks.bucket }, storageBucketName: 'reels.test', SITE_URL, uploadDate, url });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.published.mockResolvedValue([reel]);
  mocks.bucket.mockReturnValue({ file: mocks.file });
  mocks.file.mockImplementation((path: string) => ({
    getSignedUrl: (options: { expires: number }) => mocks.sign(path, options),
    getMetadata: mocks.metadata,
  }));
  mocks.metadata.mockResolvedValue([{ timeCreated: uploadDate }]);
  mocks.sign.mockImplementation(async (path: string, options: { expires: number }) => [
    `https://storage.googleapis.com/reels.test/${path}?X-Goog-Signature=secret&X-Goog-Expires=3600&Expires=${options.expires}&Signature=secret`,
  ]);
});
afterEach(() => vi.useRealTimers());

describe('permanent reel search and social URLs #590', () => {
  it.each(['contentUrl', 'thumbnailUrl', 'og:image', 'embedUrl'])('keeps %s stable on the page', async (field) => {
    const index = ['contentUrl', 'thumbnailUrl', 'og:image', 'embedUrl'].indexOf(field);
    seoChecks(await currentProjection())[index]();
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('fails all four identical checks on minimal original #556 code, passes current output', async () => {
    expect(old.commit).toBe('c48931631a099ed78dc02cf54d097c45554204b0');
    expect(old.sourceSha256).toBe('4a06cb6b65fcb21c800934e77bfba2372e0cca4f137487bb00c1f13471eaaba9');
    expect(old.sha256).toBe('f6e33d16cd724d47317d2f0ba407b6a3a55a8183437d85735ad42e9fa1e85667');
    expect(createHash('sha256').update(old.signing + old.videoObjectFields + old.openGraphImages).digest('hex')).toBe(old.sha256);
    const previous = await oldProjection();
    let oldFails = 0;
    for (const check of seoChecks(previous)) { expect(check).toThrow(); oldFails++; }
    expect(oldFails).toBe(4);
    let newFails = 0;
    for (const check of seoChecks(await currentProjection())) { try { check(); } catch { newFails++; } }
    expect(newFails).toBe(0);
    console.log(`OLD_FAILS=${oldFails}\nNEW_FAILS=${newFails}`);
  });

  it.each([['poster', poster, reel.posterPath], ['video', video, reel.videoPath]] as const)(
    'refreshes the %s target after an hour and checks publication again', async (kind, get, path) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
      const request = guest(`/reels/${reel.id}/${kind}`);
      const first = await get(request, props());
      expect(first.status).toBe(302);
      expect(first.headers.get('cache-control')).toBe('no-store');
      expect(first.headers.get('location')).toContain('X-Goog-Signature=secret');
      expect(mocks.sign).toHaveBeenLastCalledWith(path, { action: 'read', expires: Date.now() + 3600000 });
      vi.setSystemTime(new Date('2026-11-15T11:01:00Z'));
      const second = await get(request, props());
      expect(second.status).toBe(302);
      expect(second.headers.get('cache-control')).toBe('no-store');
      expect(second.headers.get('location')).not.toBe(first.headers.get('location'));
      expect(mocks.sign).toHaveBeenLastCalledWith(path, { action: 'read', expires: Date.now() + 3600000 });
      mocks.published.mockResolvedValue([]);
      const withdrawn = await get(request, props());
      expect(withdrawn.status).toBe(404);
      expect(withdrawn.headers.get('location')).toBeNull();
      expect(withdrawn.headers.get('cache-control')).toBe('no-store');
      expect(mocks.sign).toHaveBeenCalledTimes(2);
      expect(mocks.published).toHaveBeenCalledTimes(3);
    },
  );

  it('uses the permanent poster endpoint for the legacy fallback too', async () => {
    mocks.published.mockResolvedValue([{ ...reel, posterPath: undefined }]);
    seoChecks(await currentProjection())[1]();
    const response = await poster(guest(`/reels/${reel.id}/poster`), props());
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/og-gelato.png`);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it.each([poster, video])('returns 404 for a missing/unpublished reel without signing or metadata reads', async (get) => {
    mocks.published.mockResolvedValue([]);
    const response = await get(guest(`/reels/${reel.id}/poster`), props());
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(mocks.bucket).not.toHaveBeenCalled();
  });

  it.each(['private', 'a'.repeat(19), 'a'.repeat(21), 'a'.repeat(19) + '-', 'a'.repeat(19) + '_', 'a'.repeat(19) + 'я'])(
    'rejects invalid id %s before reading publication state', async (id) => {
      for (const get of [poster, video]) {
        expect((await get(guest(`/reels/${id}/poster`), props(id))).status).toBe(404);
      }
      await expect(ReelPage(props(id))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      expect(mocks.published).not.toHaveBeenCalled();
      expect(mocks.bucket).not.toHaveBeenCalled();
    },
  );

  it.each(['poster', 'video'])('opens only the exact %s path for guests', (kind) => {
    for (const id of [reel.id, '0123456789abcdefghij', 'ABCDEFGHIJKLMNOPQRST']) {
      for (const suffix of ['', '/', '?utm_source=share']) {
        const response = proxy(guest(`/reels/${id}/${kind}${suffix}`));
        expect(response.status).toBe(200);
        expect(response.headers.get('x-middleware-next')).toBe('1');
      }
    }
    expect(mocks.published).not.toHaveBeenCalled();
  });

  it.each([
    '/reels/private/poster', `/reels/${'a'.repeat(19)}/poster`, `/reels/${'a'.repeat(21)}/video`,
    `/reels/${'a'.repeat(19)}-/poster`, `/reels/${'a'.repeat(19)}_/video`, `/reels/${'a'.repeat(19)}я/poster`,
    `/reels/${reel.id}/poster/edit`, `/reels/${reel.id}/video/more`, `/reels/${reel.id}/poster-extra`,
    `/reels/${reel.id}/edit`, `/reels/${reel.id}/upload`, '/admin/reels', '/reels-private/poster',
  ])('preserves the guest gate for %s', (path) => {
    const response = proxy(guest(path));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/login`);
    expect(mocks.published).not.toHaveBeenCalled();
  });

  it('keeps both media routes dynamic', () => {
    expect(posterDynamic).toBe('force-dynamic');
    expect(videoDynamic).toBe('force-dynamic');
  });
});
