import 'server-only';
import { cache } from 'react';
import { listPublishedReels } from '@/lib/db/reels';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
import { reelPosterUrl } from '@/lib/reel-urls';

// Reuse the feed's publication boundary, including the linked course.
export const getPublishedReel = cache(async (slug: string) => {
  if (!/^[\w-]{1,128}$/.test(slug)) return null;
  return (await listPublishedReels()).find((reel) => reel.id === slug) ?? null;
});

export const getReelUploadDate = cache(async (videoPath: string): Promise<string | undefined> => {
  try {
    const [metadata] = await adminStorage.bucket(storageBucketName).file(videoPath).getMetadata();
    const timestamp = typeof metadata.timeCreated === 'string' ? Date.parse(metadata.timeCreated) : NaN;
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
  } catch {
    // Old files may lack readable metadata. Never substitute the request date.
    return undefined;
  }
});

export async function reelMediaResponse(slug: string, kind: 'video' | 'poster'): Promise<Response> {
  const reel = await getPublishedReel(slug);
  if (!reel) return new Response('Рилс не найден.', { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const path = kind === 'video' ? reel.videoPath : reel.posterPath;
  const location = path
    ? (await adminStorage.bucket(storageBucketName).file(path).getSignedUrl({
      action: 'read', expires: Date.now() + 60 * 60 * 1000,
    }))[0]
    : reelPosterUrl(reel);

  // A stable URL refreshes the signature on every request, without changing Storage ACLs.
  return new Response(null, {
    status: 307,
    headers: { Location: location, 'Cache-Control': 'private, no-store' },
  });
}
