import { SITE_URL } from '@/lib/site';
import type { Reel } from '@/lib/reels';

// Firestore IDs already identify reels; titles must never change their URLs.
export const reelPath = (id: string) => `/reels/${encodeURIComponent(id)}`;
export const reelUrl = (id: string) => `${SITE_URL}${reelPath(id)}`;
export const reelPosterUrl = (reel: Pick<Reel, 'id' | 'posterPath'>) =>
  reel.posterPath ? `${reelUrl(reel.id)}/poster` : `${SITE_URL}/og-gelato.png`;

export const isPublicReelPath = (pathname: string) =>
  /^\/reels\/[\w-]{1,128}(?:\/(?:video|poster))?\/?$/.test(pathname);
