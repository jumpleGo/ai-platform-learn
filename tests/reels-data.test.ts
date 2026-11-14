import { beforeEach, expect, it, vi } from 'vitest';
import { createReel, getReel, listPublishedReels, setReelVideoPath } from '@/lib/db/reels';
import type { Reel } from '@/lib/reels';

const mocks = vi.hoisted(() => ({ collection: vi.fn(), get: vi.fn(), add: vi.fn(), update: vi.fn(), doc: vi.fn(), where: vi.fn(), courses: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: mocks.collection } }));
const draft = { title: 'First reel', courseSlug: 'claude-code-agents', order: 0 };
const path = 'reels/reel-1/123e4567-e89b-42d3-a456-426614174000.mp4';
const reel: Reel = { id: 'reel-1', ...draft, videoPath: path, published: true };
const doc = (id: string, data: object) => ({ id, exists: true, data: () => data });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.collection.mockImplementation((name) => name === 'courses'
    ? { where: () => ({ get: mocks.courses }) }
    : { doc: mocks.doc, add: mocks.add, where: mocks.where });
  mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update });
  mocks.where.mockReturnValue({ get: mocks.get });
  mocks.courses.mockResolvedValue({ docs: [doc('course-1', { slug: draft.courseSlug, published: true })] });
  mocks.add.mockResolvedValue({ id: 'reel-1' });
});

it('creates an unpublished draft in reels using the Admin SDK', async () => {
  expect(await createReel(draft)).toBe('reel-1');
  expect(mocks.collection).toHaveBeenCalledWith('reels');
  expect(mocks.add).toHaveBeenCalledWith({ ...draft, videoPath: '', published: false });
});
it('rejects invalid metadata and unknown or unpublished courses', async () => {
  for (const input of [{ ...draft, title: ' ' }, { ...draft, order: -1 }, { ...draft, order: 0.5 }, { ...draft, courseSlug: '../x' }]) {
    await expect(createReel(input)).rejects.toThrow();
  }
  for (const docs of [[], [doc('course-1', { slug: draft.courseSlug, published: false })]]) {
    mocks.courses.mockResolvedValue({ docs });
    await expect(createReel(draft)).rejects.toThrow();
  }
  expect(mocks.add).not.toHaveBeenCalled();
});
it('reads only the Reel projection with the document ID', async () => {
  mocks.get.mockResolvedValue(doc('reel-1', { ...reel, id: 'spoofed', privateNote: 'internal', posterPath: 'reels/reel-1/poster.webp' }));
  expect(await getReel('reel-1')).toEqual({ ...reel, posterPath: 'reels/reel-1/poster.webp' });
  mocks.get.mockResolvedValue({ exists: false });
  expect(await getReel('missing')).toBeNull();
});
it('lists ready published reels for published courses in stable order', async () => {
  mocks.get.mockResolvedValue({ docs: [
    doc('b', { ...reel, order: 1 }), doc('a', { ...reel, order: 1 }),
    doc('first', { ...reel, order: 0 }), doc('draft', { ...reel, published: false }),
    doc('empty', { ...reel, videoPath: '' }), doc('retired-course', { ...reel, courseSlug: 'retired' }),
  ] });
  expect((await listPublishedReels()).map((r) => r.id)).toEqual(['first', 'a', 'b']);
  expect(mocks.where).toHaveBeenCalledWith('published', '==', true);
});
it('attaches only this reel’s Storage path and resets publication', async () => {
  await setReelVideoPath('reel-1', path);
  expect(mocks.doc).toHaveBeenCalledWith('reel-1');
  expect(mocks.update).toHaveBeenCalledWith({ videoPath: path, published: false });
  mocks.update.mockClear();
  for (const invalid of ['https://external.example/file.mp4', 'reels/other/a.mp4', 'reels/reel-1/../a.mp4']) {
    await expect(setReelVideoPath('reel-1', invalid)).rejects.toThrow();
  }
  expect(mocks.update).not.toHaveBeenCalled();
});
