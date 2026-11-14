import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_REEL_BYTES, readReelUpload } from '@/lib/reel-upload';
import { POST } from '@/app/api/admin/reels/[reelId]/upload/route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), getReel: vi.fn(), setReelVideoPath: vi.fn(), save: vi.fn(), file: vi.fn(), bucket: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db/reels', () => ({ getReel: mocks.getReel, setReelVideoPath: mocks.setReelVideoPath }));
vi.mock('@/lib/firebase/admin', () => ({ adminStorage: { bucket: mocks.bucket }, storageBucketName: 'test-bucket' }));

function video(brand = 'isom', compatible: string[] = []) {
  const bytes = Buffer.alloc(20 + compatible.length * 4);
  bytes.writeUInt32BE(16 + compatible.length * 4);
  bytes.write('ftyp', 4);
  bytes.write(brand, 8);
  compatible.forEach((b, i) => bytes.write(b, 16 + i * 4));
  return bytes;
}
function request(bytes = video(), headers: Record<string, string> = {}) {
  return new Request('https://gelato.education/api/admin/reels/reel-1/upload', {
    method: 'POST', body: new Uint8Array(bytes), headers,
  });
}
const context = { params: Promise.resolve({ reelId: 'reel-1' }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ uid: 'admin', role: 'admin' });
  mocks.getReel.mockResolvedValue({ id: 'reel-1', published: false });
  mocks.bucket.mockReturnValue({ file: mocks.file });
  mocks.file.mockReturnValue({ save: mocks.save });
});

describe('reel bytes', () => {
  it.each(['isom', 'mp4 ', 'mp42', 'avc1', 'qt  '])('accepts allowed brand %s', async (brand) => {
    const result = await readReelUpload(request(video(brand)));
    expect(result.extension).toBe(brand === 'qt  ' ? 'mov' : 'mp4');
    expect(result.buffer).toEqual(video(brand));
  });
  it('accepts video despite image extension and MIME', async () => {
    const result = await readReelUpload(request(video('isom', ['avc1', 'mp42']), {
      'content-type': 'image/jpeg', 'content-disposition': 'attachment; filename="poster.jpg"',
    }));
    expect(result.contentType).toBe('video/mp4');
  });
  it.each(['avif', 'heic', 'heix', 'mif1', 'jpeg', 'xxxx'])('rejects major and compatible brand %s', async (brand) => {
    for (const bytes of [video(brand), video('isom', [brand])]) {
      await expect(readReelUpload(request(bytes, { 'content-type': 'video/mp4' }))).rejects.toMatchObject({ status: 415 });
    }
  });
  it('rejects wrong content despite video extension and MIME', async () => {
    await expect(readReelUpload(request(Buffer.from('not a video file at all'), {
      'content-type': 'video/mp4', 'content-disposition': 'attachment; filename="clip.mp4"',
    }))).rejects.toMatchObject({ status: 415 });
  });
  it('rejects empty, shifted, truncated and misaligned ftyp boxes', async () => {
    const truncated = video(); truncated.writeUInt32BE(100);
    const misaligned = video(); misaligned.writeUInt32BE(17);
    const short = video(); short.writeUInt32BE(12);
    for (const bytes of [Buffer.alloc(0), video().subarray(0, 12), Buffer.concat([Buffer.of(0), video()]), truncated, misaligned, short]) {
      await expect(readReelUpload(request(bytes))).rejects.toMatchObject({ status: 415 });
    }
  });
  it('accepts exactly 20 MiB and rejects one byte more, regardless of Content-Length', async () => {
    const bytes = Buffer.alloc(MAX_REEL_BYTES); video().copy(bytes);
    await expect(readReelUpload(request(bytes))).resolves.toMatchObject({ extension: 'mp4' });
    for (const headers of [{}, { 'content-length': '1' }]) {
      await expect(readReelUpload(request(Buffer.concat([bytes, Buffer.of(0)]), headers))).rejects.toMatchObject({ status: 413 });
    }
  });
  it('cancels an oversized stream before consuming the rest', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_REEL_BYTES + 1)); }, cancel });
    const req = new Request('https://gelato.education', { method: 'POST', body, duplex: 'half' } as RequestInit);
    await expect(readReelUpload(req)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalled();
  });
});

describe('admin upload', () => {
  it.each([null, { uid: 'user', role: 'student' }])('rejects non-admin before reading or writing', async (session) => {
    mocks.getSession.mockResolvedValue(session);
    const req = request();
    expect((await POST(req, context)).status).toBe(403);
    expect(req.bodyUsed).toBe(false);
    expect(mocks.getReel).not.toHaveBeenCalled();
    expect(mocks.bucket).not.toHaveBeenCalled();
  });
  it.each([['isom', 'mp4', 'video/mp4'], ['qt  ', 'mov', 'video/quicktime']])('stores %s with a server-generated path', async (brand, ext, contentType) => {
    const response = await POST(request(video(brand)), context);
    expect(response.status).toBe(200);
    const { videoPath } = await response.json();
    expect(videoPath).toMatch(new RegExp(`^reels/reel-1/[a-f0-9-]{36}\\.${ext}$`));
    expect(mocks.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mocks.file).toHaveBeenCalledWith(videoPath);
    expect(mocks.save).toHaveBeenCalledWith(video(brand), expect.objectContaining({ contentType }));
    expect(mocks.setReelVideoPath).toHaveBeenCalledWith('reel-1', videoPath);
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.setReelVideoPath.mock.invocationCallOrder[0]);
  });
  it('rejects a cross-origin upload', async () => {
    expect((await POST(request(video(), { origin: 'https://other.example' }), context)).status).toBe(403);
    expect(mocks.bucket).not.toHaveBeenCalled();
  });
  it('rejects invalid IDs and missing drafts without uploading', async () => {
    expect((await POST(request(), { params: Promise.resolve({ reelId: '../other' }) })).status).toBe(400);
    mocks.getReel.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(404);
    expect(mocks.bucket).not.toHaveBeenCalled();
  });
  it('rejects invalid or oversized bytes without a Storage write', async () => {
    expect((await POST(request(video('avif')), context)).status).toBe(415);
    expect((await POST(request(Buffer.alloc(MAX_REEL_BYTES + 1)), context)).status).toBe(413);
    expect(mocks.bucket).not.toHaveBeenCalled();
    expect(mocks.setReelVideoPath).not.toHaveBeenCalled();
  });
  it('does not mark the reel ready when Storage fails', async () => {
    mocks.save.mockRejectedValue(new Error('private backend details'));
    const response = await POST(request(), context);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private backend');
    expect(mocks.setReelVideoPath).not.toHaveBeenCalled();
  });
});
