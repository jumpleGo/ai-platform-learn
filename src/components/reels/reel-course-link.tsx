'use client';

import { useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { normalizeReel, type Reel } from '@/lib/reels';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

const key = 'gelato:reel-cta-pending';
type Pending = { pathname: string; time: number; props: ReelEventProps & { lesson: string | null } };
let pending: Pending | null = null;

export function ReelCourseLink({ reel, eventProps }: { reel: Reel; eventProps: ReelEventProps }) {
  if (!reel.courseSlug?.trim()) return null;
  const { ctaHref, ctaLabel } = normalizeReel(reel, { title: reel.title || '' });
  const remember = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(ctaHref, window.location.href);
    if (url.origin !== window.location.origin) return;
    const target = /^\/courses\/([^/]+)(?:\/lessons\/([^/]+))?\/?$/.exec(url.pathname);
    if (!target) return;
    pending = { pathname: url.pathname, time: Date.now(), props: {
      ...eventProps, course_slug: decodeURIComponent(target[1]), lesson: target[2] ? decodeURIComponent(target[2]) : null,
    } };
    try { sessionStorage.setItem(key, JSON.stringify(pending)); } catch { /* SPA still uses memory. */ }
  };
  return <Link href={ctaHref} onClick={remember} data-reel-course-link
    className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition-colors hover:bg-neutral-200 active:scale-95">
    {ctaLabel}
  </Link>;
}

// Lives in the root layout: the event is emitted after the destination mounts,
// including a full page load, and consumed once before sending to PostHog.
export function ReelCtaArrival() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) pending = JSON.parse(saved) as Pending;
    } catch { /* Storage may be unavailable. */ }
    if (!pending) return;
    if (Date.now() - pending.time > 60_000) {
      pending = null;
      try { sessionStorage.removeItem(key); } catch { /* Optional persistence. */ }
      return;
    }
    if (pending.pathname !== pathname) return;
    const { props } = pending;
    pending = null;
    try { sessionStorage.removeItem(key); } catch { /* Optional persistence. */ }
    track(EVENTS.reelCtaClicked, props);
  }, [pathname]);
  return null;
}
