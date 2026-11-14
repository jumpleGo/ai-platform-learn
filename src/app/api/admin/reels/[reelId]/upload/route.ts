import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/require-admin';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
import { getReel, setReelVideoPath } from '@/lib/db/reels';
import { readReelUpload, ReelUploadError } from '@/lib/reel-upload';

export const runtime = 'nodejs';
const failure = (error: string, status: number) => Response.json({ error }, { status });

// Raw video body.
export async function POST(request: Request, context: { params: Promise<{ reelId: string }> }) {
  try { await requireAdmin(); }
  catch { return failure('Forbidden', 403); }
  const origin = request.headers.get('origin');
  // за nginx request.url — внутренний адрес контейнера, поэтому сверяем с Host от прокси
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  if (origin && new URL(origin).host !== host) {
    return failure('Forbidden origin', 403);
  }
  const { reelId } = await context.params;
  if (!/^[\w-]{1,128}$/.test(reelId)) return failure('Invalid reel ID', 400);
  try {
    const reel = await getReel(reelId);
    if (!reel) return failure('Reel not found', 404);
    const { buffer, extension, contentType } = await readReelUpload(request);
    const videoPath = `reels/${reelId}/${randomUUID()}.${extension}`;
    const bucket = adminStorage.bucket(storageBucketName);
    await bucket.file(videoPath).save(buffer, { contentType, resumable: false });
    await setReelVideoPath(reelId, videoPath);
    // Delete only the exact previously recorded video in this reel's namespace.
    const oldPath = reel.videoPath;
    const oldMatch = /^reels\/([\w-]+)\/[a-f0-9-]{36}\.(mp4|mov)$/.exec(oldPath ?? '');
    if (oldMatch?.[1] === reelId && oldPath !== videoPath) {
      try { await bucket.file(oldPath).delete({ ignoreNotFound: true }); }
      catch {
        return Response.json({ videoPath, warning: 'Новое видео сохранено, но старый файл не удалось удалить.' });
      }
    }
    return Response.json({ videoPath });
  } catch (error) {
    const status = error instanceof ReelUploadError ? error.status : 500;
    return failure(error instanceof ReelUploadError ? error.message : 'Upload failed', status);
  }
}
