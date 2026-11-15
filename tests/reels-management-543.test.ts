/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({
  session: vi.fn(), collection: vi.fn(), ref: vi.fn(), get: vi.fn(), update: vi.fn(),
  removeDoc: vi.fn(), courses: vi.fn(), where: vi.fn(), bucket: vi.fn(), file: vi.fn(),
  removeFile: vi.fn(), revalidate: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/session', () => ({ getSession: s.session }));
vi.mock('next/cache', () => ({ revalidatePath: s.revalidate }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: s.collection },
  adminStorage: { bucket: s.bucket }, storageBucketName: 'reels-543.test',
}));

// Keep every regression runnable on the old checkout, where the route is absent.
type Handler = (request: Request, context: { params: Promise<{ reelId: string }> }) => Promise<Response>;
const modules = import.meta.glob('../src/app/api/admin/reels/*/route.ts', { eager: true });
const route = Object.values(modules)[0] as { PATCH: Handler; DELETE: Handler } | undefined;
const path = 'reels/reel-1/123e4567-e89b-42d3-a456-426614174000.mp4';
const reel = { title: 'Рилс', courseSlug: 'course-a', videoPath: path, published: false, order: 1 };
const doc = (data: object) => ({ id: 'reel-1', exists: true, data: () => data });

beforeEach(() => {
  vi.resetAllMocks();
  s.session.mockResolvedValue({ role: 'admin' });
  s.collection.mockImplementation((name: string) => {
    if (name === 'reels') return { doc: s.ref };
    if (name === 'courses') return { where: s.where };
    throw new Error(`Unexpected collection: ${name}`);
  });
  s.ref.mockReturnValue({ get: s.get, update: s.update, delete: s.removeDoc });
  s.get.mockResolvedValue(doc(reel));
  s.where.mockReturnValue({ get: s.courses });
  s.courses.mockResolvedValue({ docs: [doc({ slug: 'course-a', published: true })] });
  s.bucket.mockReturnValue({ file: s.file });
  s.file.mockReturnValue({ delete: s.removeFile });
});

async function call(method: 'PATCH' | 'DELETE', body: unknown = { published: true }, options: {
  id?: string; headers?: Record<string, string>; rawBody?: string;
} = {}) {
  expect(route, 'Admin reel PATCH/DELETE route is missing').toBeDefined();
  expect(route![method], `${method} handler is missing`).toBeTypeOf('function');
  return route![method](new Request('https://gelato.education/api/admin/reels/reel-1', {
    method, headers: { 'content-type': 'application/json', ...options.headers },
    ...(method === 'PATCH' ? { body: options.rawBody ?? JSON.stringify(body) } : {}),
  }), { params: Promise.resolve({ reelId: options.id ?? 'reel-1' }) });
}
function noWrites() {
  for (const spy of [s.update, s.removeDoc, s.bucket, s.revalidate]) expect(spy).not.toHaveBeenCalled();
}

describe.each(['PATCH', 'DELETE'] as const)('%s admin guard and request validation', (method) => {
  it.each([null, { role: 'student' }])('denies non-admin %j before reading Firestore', async (session) => {
    s.session.mockResolvedValue(session);
    expect((await call(method)).status).toBe(403);
    expect(s.collection).not.toHaveBeenCalled(); noWrites();
  });
  it.each(['https://other.test', 'null', 'invalid origin'])('rejects origin %s', async (origin) => {
    expect((await call(method, undefined, { headers: { origin } })).status).toBe(403);
    expect(s.collection).not.toHaveBeenCalled(); noWrites();
  });
  it('accepts the same proxy host handling as upload', async () => {
    expect((await call(method, { published: true }, {
      headers: { origin: 'https://public.test', host: 'next:3000', 'x-forwarded-host': 'public.test' },
    })).status).toBe(200);
  });
  it('rejects a malformed reel ID before reading Firestore', async () => {
    expect((await call(method, undefined, { id: '../other' })).status).toBe(400);
    expect(s.collection).not.toHaveBeenCalled(); noWrites();
  });
  it('reports a missing reel in Russian', async () => {
    s.get.mockResolvedValue({ exists: false });
    const response = await call(method);
    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/Рилс не найден/); noWrites();
  });
});

describe('reel publication', () => {
  it('publishes only the requested reel and invalidates admin and public pages', async () => {
    const response = await call('PATCH');
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ published: true });
    expect(s.ref).toHaveBeenCalledWith('reel-1');
    expect(s.update).toHaveBeenCalledExactlyOnceWith({ published: true });
    expect(s.where).toHaveBeenCalledWith('published', '==', true);
    expect(s.revalidate.mock.calls).toEqual([['/admin/reels'], ['/reels']]);
    expect(s.bucket).not.toHaveBeenCalled();
  });
  it.each(['', '   ', undefined])('rejects a missing video path: %j', async (videoPath) => {
    s.get.mockResolvedValue(doc({ ...reel, videoPath }));
    const response = await call('PATCH');
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/загрузите видео/i); noWrites();
  });
  it.each([
    { docs: [] },
    { docs: [doc({ slug: 'course-a', published: false })] },
    { docs: [doc({ slug: 'another-course', published: true })] },
  ])(
    'rejects unpublished, missing or unrelated courses: %j', async ({ docs }) => {
      s.courses.mockResolvedValue({ docs });
      const response = await call('PATCH');
      expect(response.status).toBe(400);
      expect((await response.json()).error).toMatch(/курс.*не опубликован/i); noWrites();
    },
  );
  it('can unpublish even if the video and course no longer exist', async () => {
    s.get.mockResolvedValue(doc({ ...reel, videoPath: '', published: true }));
    s.courses.mockRejectedValue(new Error('Must not query course when unpublishing'));
    const response = await call('PATCH', { published: false });
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ published: false });
    expect(s.update).toHaveBeenCalledExactlyOnceWith({ published: false });
    expect(s.courses).not.toHaveBeenCalled(); expect(s.bucket).not.toHaveBeenCalled();
  });
  it.each([null, {}, { published: 'true' }, { published: 1 }])('rejects invalid publication payload %j', async (body) => {
    expect((await call('PATCH', body)).status).toBe(400); noWrites();
  });
  it('rejects malformed JSON', async () => {
    expect((await call('PATCH', undefined, { rawBody: '{' })).status).toBe(400); noWrites();
  });
  it('hides database error details and does not report success', async () => {
    s.update.mockRejectedValue(new Error('private database detail'));
    const response = await call('PATCH');
    expect(response.status).toBe(500);
    const { error } = await response.json();
    expect(error).toMatch(/[А-Яа-я]/); expect(error).not.toContain('private');
    expect(s.revalidate).not.toHaveBeenCalled();
  });
});

describe('reel deletion', () => {
  it('deletes exactly the recorded video before deleting the document', async () => {
    const response = await call('DELETE');
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ deleted: true });
    expect(s.bucket).toHaveBeenCalledExactlyOnceWith('reels-543.test');
    expect(s.file).toHaveBeenCalledExactlyOnceWith(path);
    expect(s.removeFile).toHaveBeenCalledExactlyOnceWith({ ignoreNotFound: true });
    expect(s.removeDoc).toHaveBeenCalledTimes(1);
    expect(s.removeFile.mock.invocationCallOrder[0]).toBeLessThan(s.removeDoc.mock.invocationCallOrder[0]);
    expect(s.revalidate.mock.calls).toEqual([['/admin/reels'], ['/reels']]);
  });
  it('treats an already absent Storage object as successful cleanup', async () => {
    s.removeFile.mockImplementation(async (options) => {
      if (!options?.ignoreNotFound) throw Object.assign(new Error('Not found'), { code: 404 });
    });
    expect((await call('DELETE')).status).toBe(200);
    expect(s.removeDoc).toHaveBeenCalledTimes(1);
  });
  it('deletes a draft without a video without accessing Storage', async () => {
    s.get.mockResolvedValue(doc({ ...reel, videoPath: '' }));
    expect((await call('DELETE')).status).toBe(200);
    expect(s.bucket).not.toHaveBeenCalled(); expect(s.removeDoc).toHaveBeenCalledTimes(1);
  });
  it.each(['reels/other/123e4567-e89b-42d3-a456-426614174000.mp4', 'reels/reel-1/../other.mp4', 'courses/video.mp4'])('refuses unsafe stored paths: %s', async (videoPath) => {
    s.get.mockResolvedValue(doc({ ...reel, videoPath }));
    const response = await call('DELETE');
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/[А-Яа-я]/); noWrites();
  });
  it('keeps the document for retry on Storage failure', async () => {
    s.removeFile.mockRejectedValue(Object.assign(new Error('private storage detail'), { code: 503 }));
    const response = await call('DELETE');
    expect(response.status).toBe(500);
    expect((await response.json()).error).not.toContain('private');
    expect(s.removeDoc).not.toHaveBeenCalled(); expect(s.revalidate).not.toHaveBeenCalled();
  });
  it('allows retry if Firestore deletion failed after Storage cleanup', async () => {
    s.removeDoc.mockRejectedValueOnce(new Error('private database detail'));
    expect((await call('DELETE')).status).toBe(500);
    expect(s.revalidate).not.toHaveBeenCalled();
    expect((await call('DELETE')).status).toBe(200);
    expect(s.removeDoc).toHaveBeenCalledTimes(2);
  });
});
