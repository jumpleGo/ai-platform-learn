import 'server-only';
import { NextResponse } from 'next/server';
import { listPublishedReels } from '@/lib/db/reels';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
import { SITE_URL } from '@/lib/site';

const LINK_TTL_MS = 60 * 60 * 1000;
const headers = { 'Cache-Control': 'no-store' };

export async function redirectReelMedia(id: string, kind: 'poster' | 'video') {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) {
    return new NextResponse(null, { status: 404, headers });
  }
  // Also excludes missing videos and reels whose course is no longer published.
  const reel = (await listPublishedReels()).find((item) => item.id === id);
  if (!reel) return new NextResponse(null, { status: 404, headers });

  const path = kind === 'poster' ? reel.posterPath : reel.videoPath;
  const [url] = path
    ? await adminStorage.bucket(storageBucketName).file(path).getSignedUrl({
      action: 'read', expires: Date.now() + LINK_TTL_MS,
    })
    : [`${SITE_URL}/og-gelato.png`];
  // Never cache the expiring target or bypass the next publication check.
  return NextResponse.redirect(url, { status: 302, headers });
}
