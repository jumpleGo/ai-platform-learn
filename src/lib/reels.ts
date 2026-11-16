// Match the raw upload endpoint and nginx client_max_body_size 10m.
export const MAX_REEL_BYTES = 10 * 1024 * 1024;
export const MAX_REEL_DESCRIPTION_LENGTH = 300;
export const REEL_TEXT_FIELDS = ['title', 'description', 'ctaLabel', 'ctaHref'] as const;

export type Reel = {
  id: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  courseSlug: string;
  videoPath: string;
  posterPath?: string;
  order: number;
  published: boolean;
  likeCount?: number;
};

export type ReelMetadata = Pick<Reel, 'courseSlug' | 'order' | (typeof REEL_TEXT_FIELDS)[number]>;
export type NormalizedReel = Reel & Required<Pick<Reel, (typeof REEL_TEXT_FIELDS)[number]>> & {
  likeCount: number;
};

export function isValidReelCtaHref(href: string): boolean {
  // Browsers normalize backslashes and control characters in navigation URLs.
  if (/[\u0000-\u0020\u007f\\]/.test(href)) return false;
  if (href.startsWith('/')) return !href.startsWith('//');
  if (!/^https:\/\/[^/]/.test(href)) return false;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// Keep stored overrides separate from course defaults so edits can clear them.
export function normalizeReel(reel: Reel, course: { title: string; description?: string }): NormalizedReel {
  const ctaHref = reel.ctaHref?.trim();
  return {
    ...reel,
    title: reel.title?.trim() || course.title,
    description: (reel.description?.trim() || course.description?.trim() || '').slice(0, MAX_REEL_DESCRIPTION_LENGTH),
    ctaLabel: reel.ctaLabel?.trim() || 'Перейти в курс',
    ctaHref: ctaHref && isValidReelCtaHref(ctaHref) ? ctaHref : `/courses/${reel.courseSlug}`,
    likeCount: typeof reel.likeCount === 'number' && Number.isFinite(reel.likeCount) && reel.likeCount >= 0
      ? reel.likeCount
      : 0,
  };
}
