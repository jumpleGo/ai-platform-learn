import { beforeEach, expect, it, vi, type Mock } from 'vitest';
import { MAX_REEL_BYTES, readReelUpload as read } from '@/lib/reel-upload';
import { POST } from '@/app/api/admin/reels/[reelId]/upload/route';

const [getSession, getReel, setReelVideoPath, save, file, bucket] =
  vi.hoisted(() => Array.from({ length: 6 }, () => vi.fn()));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/session', () => ({ getSession }));
vi.mock('@/lib/db/reels', () => ({ getReel, setReelVideoPath }));
vi.mock('@/lib/firebase/admin', () => ({ adminStorage: { bucket }, storageBucketName: 'test-bucket' }));

function video(brand = 'isom', compatible: string[] = []) {
  const bytes = Buffer.alloc(20 + compatible.length * 4);
  bytes.writeUInt32BE(16 + compatible.length * 4);
  bytes.write('ftyp', 4);
  bytes.write(brand, 8);
  compatible.forEach((b, i) => bytes.write(b, 16 + i * 4));
  return bytes;
}
function request(bytes: Buffer = video(), headers: Record<string, string> = {}) {
  return new Request('https://x.test', {
    method: 'POST', body: new Uint8Array(bytes), headers,
  });
}
const ctx = (reelId = 'reel-1') => ({ params: Promise.resolve({ reelId }) });
const called = (spy: Mock, ...args: unknown[]) => expect(spy).toHaveBeenCalledWith(...args);
const upload = (req = request(), context = ctx()) => POST(req, context);
const uncalled = (...spies: Mock[]) => spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
const rejects = (bytes: Buffer, status = 415, headers = {}) =>
  expect(read(request(bytes, headers))).rejects.toMatchObject({ status });

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ role: 'admin' });
getReel.mockResolvedValue({ id: 'reel-1', published: false });
bucket.mockReturnValue({ file });
file.mockReturnValue({ save });
});

it('validates signatures', async () => {
  for (const brand of ['avif', 'avis', 'heic', 'heix', 'mif1', 'msf1']) {
    for (const bytes of [video(brand), video('isom', [brand])]) {
      await rejects(bytes, 415, { 'content-type': 'video/mp4' });
    }
  }
  await rejects(Buffer.from('not video content'), 415, {
    'content-type': 'video/mp4', 'content-disposition': 'attachment; filename=x.mp4',
  });

  const truncated = video(); truncated.writeUInt32BE(100);
  const misaligned = video(); misaligned.writeUInt32BE(17);
  const short = video(); short.writeUInt32BE(12);
  const highBit = video(); highBit[4] |= 128;
  for (const bytes of [Buffer.alloc(0), video().subarray(0, 12), Buffer.concat([Buffer.of(0), video()]), truncated, misaligned, short, highBit]) {
    await rejects(bytes);
  }
});
it('accepts the ffmpeg ftyp brands', async () => {
  const bytes = video('isom', ['isom', 'iso2', 'avc1', 'mp41']);
  await expect(read(request(bytes))).resolves.toEqual({
    buffer: bytes, extension: 'mp4', contentType: 'video/mp4',
  });
});
it.each(['mp41', 'iso5', 'M4V ', 'jpeg', 'xxxx'].flatMap((brand) => [
  { major: brand, compatible: ['isom'] },
  { major: 'isom', compatible: [brand] },
]))('accepts ISO BMFF brands $major / $compatible', async ({ major, compatible }) => {
  const bytes = video(major, compatible);
  await expect(read(request(bytes))).resolves.toEqual({
    buffer: bytes, extension: 'mp4', contentType: 'video/mp4',
  });
});
it('enforces the 10 MiB nginx limit', async () => {
  expect(MAX_REEL_BYTES).toBe(10485760);
  const bytes = Buffer.alloc(10485760); video().copy(bytes);
  await expect(read(request(bytes))).resolves.toMatchObject({ extension: 'mp4' });
  const oversized = Buffer.alloc(10485761); video().copy(oversized);
  for (const headers of [{}, { 'content-length': '1' }]) {
    await rejects(oversized, 413, headers);
  }
});
it('cancels oversized streams', async () => {
  const cancel = vi.fn();
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_REEL_BYTES + 1)); }, cancel });
  const req = new Request('https://x.test', { method: 'POST', body, duplex: 'half' } as RequestInit);
  await expect(read(req)).rejects.toMatchObject({ status: 413 });
  expect(cancel).toHaveBeenCalled();
});

it.each([null, { role: 'student' }])('denies non-admin', async (session) => {
  getSession.mockResolvedValue(session);
  const req = request();
  expect((await upload(req)).status).toBe(403);
  expect(req.bodyUsed).toBe(false);
  uncalled(getReel, bucket);
});
it.each(['isom', 'mp4 ', 'mp42', 'avc1', 'qt  '])('stores %s by content', async (brand) => {
  const ext = brand === 'qt  ' ? 'mov' : 'mp4';
  const contentType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  const bytes = video(brand, ['avc1', 'mp42']);
  const response = await upload(request(bytes, {
    'content-type': 'image/jpeg', 'content-disposition': 'attachment; filename=x.jpg',
  }));
  expect(response.status).toBe(200);
  const { videoPath } = await response.json();
  expect(videoPath).toMatch(new RegExp(`^reels/reel-1/[a-f0-9-]{36}\\.${ext}$`));
  called(bucket, 'test-bucket');
  called(file, videoPath);
  called(save, bytes, expect.objectContaining({ contentType }));
  called(setReelVideoPath, 'reel-1', videoPath);
  expect(save.mock.invocationCallOrder[0]).toBeLessThan(setReelVideoPath.mock.invocationCallOrder[0]);
});
it('rejects invalid requests', async () => {
  for (const [req, context, status] of [
    [request(video(), { origin: 'https://y.test' }), ctx(), 403],
    [request(), ctx('../other'), 400],
    [request(video('avif')), ctx(), 415],
    [request(Buffer.alloc(10485761)), ctx(), 413],
  ] as const) expect((await upload(req, context)).status).toBe(status);
  getReel.mockResolvedValue(null);
  expect((await upload()).status).toBe(404);
  uncalled(bucket, setReelVideoPath);
});
it('handles Storage failures', async () => {
  save.mockRejectedValue(new Error('secret'));
  const response = await upload();
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('secret');
  uncalled(setReelVideoPath);
});
