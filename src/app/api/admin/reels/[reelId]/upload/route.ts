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
  if (origin && origin !== new URL(request.url).origin) {
    return failure('Forbidden origin', 403);
  }
  const { reelId } = await context.params;
  if (!/^[\w-]{1,128}$/.test(reelId)) return failure('Invalid reel ID', 400);
  try {
    if (!await getReel(reelId)) return failure('Reel not found', 404);
    const { buffer, extension, contentType } = await readReelUpload(request);
    const videoPath = `reels/${reelId}/${randomUUID()}.${extension}`;
    await adminStorage.bucket(storageBucketName).file(videoPath).save(buffer, { contentType, resumable: false });
    await setReelVideoPath(reelId, videoPath);
    return Response.json({ videoPath });
  } catch (error) {
    const status = error instanceof ReelUploadError ? error.status : 500;
    return failure(error instanceof ReelUploadError ? error.message : 'Upload failed', status);
  }
}
