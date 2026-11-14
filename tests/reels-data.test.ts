import { beforeEach, expect, it, vi, type Mock } from 'vitest';
import { createReel, getReel, listPublishedReels, setReelVideoPath } from '@/lib/db/reels';
import type { Reel } from '@/lib/reels';

const [collection, get, add, update, ref, where, courses] =
  vi.hoisted(() => Array.from({ length: 7 }, () => vi.fn()));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection } }));
const called = (spy: Mock, ...args: unknown[]) => expect(spy).toHaveBeenCalledWith(...args);
const draft = { title: 'Intro', courseSlug: 'course-a', order: 0 };
const path = 'reels/reel-1/123e4567-e89b-42d3-a456-426614174000.mp4';
const reel: Reel = { id: 'reel-1', ...draft, videoPath: path, published: true };
const doc = (id: string, data: object) => ({ id, exists: true, data: () => data });

beforeEach(() => {
  vi.resetAllMocks();
  collection.mockImplementation((name) => name === 'courses'
    ? { where: () => ({ get: courses }) }
    : { doc: ref, add, where });
  ref.mockReturnValue({ get, update });
  where.mockReturnValue({ get });
  courses.mockResolvedValue({ docs: [doc('course-1', { slug: draft.courseSlug, published: true })] });
  add.mockResolvedValue({ id: 'reel-1' });
});

it('validates drafts', async () => {
  expect(await createReel(draft)).toBe('reel-1');
  called(collection, 'reels');
  called(add, { ...draft, videoPath: '', published: false });
  add.mockClear();
  for (const input of [{ ...draft, title: ' ' }, { ...draft, order: -1 }, { ...draft, order: 0.5 }, { ...draft, courseSlug: '../x' }]) {
    await expect(createReel(input)).rejects.toThrow();
  }
  for (const docs of [[], [doc('course-1', { slug: draft.courseSlug, published: false })]]) {
    courses.mockResolvedValue({ docs });
    await expect(createReel(draft)).rejects.toThrow();
  }
  expect(add).not.toHaveBeenCalled();
});
it('filters published reels', async () => {
  get.mockResolvedValue(doc('reel-1', { ...reel, id: 'spoofed', privateNote: 'internal', posterPath: 'reels/reel-1/poster.webp' }));
  expect(await getReel('reel-1')).toEqual({ ...reel, posterPath: 'reels/reel-1/poster.webp' });
  get.mockResolvedValue({ exists: false });
  expect(await getReel('missing')).toBeNull();

  get.mockResolvedValue({ docs: [
    doc('b', { ...reel, order: 1 }), doc('a', { ...reel, order: 1 }),
    doc('first', { ...reel, order: 0 }), doc('draft', { ...reel, published: false }),
    doc('empty', { ...reel, videoPath: '' }), doc('retired', { ...reel, courseSlug: 'retired' }),
  ] });
  expect((await listPublishedReels()).map((r) => r.id)).toEqual(['first', 'a', 'b']);
  called(where, 'published', '==', true);
});
it('attaches owned paths', async () => {
  await setReelVideoPath('reel-1', path);
  called(ref, 'reel-1');
  called(update, { videoPath: path, published: false });
  update.mockClear();
  for (const invalid of ['https://x.test/a.mp4', 'reels/other/a.mp4', 'reels/reel-1/../a.mp4']) {
    await expect(setReelVideoPath('reel-1', invalid)).rejects.toThrow();
  }
  expect(update).not.toHaveBeenCalled();
});
