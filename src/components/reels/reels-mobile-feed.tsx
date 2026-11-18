'use client';

import React, { useEffect, useRef, useState } from 'react';
import { normalizeReel } from '@/lib/reels';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import { REELS_LANDSCAPE_QUERY, ReelPlayer, type ReelFeedItem } from './reel-player';

export type { ReelFeedItem };

type ReelsMobileFeedProps = {
  items: ReelFeedItem[];
  isLoggedIn?: boolean;
  exitHref?: string;
};

export function ReelsMobileFeed({ items, isLoggedIn, exitHref }: ReelsMobileFeedProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedReelRef = useRef<string | null>(null);

  useEffect(() => {
    if (!window.matchMedia) {
      setIsMobile(false);
      return;
    }
    const media = window.matchMedia('(max-width: 767px)');
    const landscape = window.matchMedia(REELS_LANDSCAPE_QUERY);
    const updateViewport = () => {
      setIsMobile(media.matches || landscape.matches);
      // A remounted scroller starts at the first reel.
      setActiveIndex(0);
    };
    updateViewport();
    media.addEventListener('change', updateViewport);
    landscape.addEventListener('change', updateViewport);
    return () => {
      media.removeEventListener('change', updateViewport);
      landscape.removeEventListener('change', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!isMobile || !container || typeof IntersectionObserver === 'undefined') return;

    const sections = container.querySelectorAll<HTMLElement>('section[data-reel-id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Array.from(sections).indexOf(entry.target as HTMLElement);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [isMobile, items.length]);

  useEffect(() => {
    if (!isMobile) {
      viewedReelRef.current = null;
      return;
    }
    const reel = items[activeIndex]?.reel;
    if (!reel || viewedReelRef.current === reel.id) return;
    // Repeated observer entries and Strict Mode effects are the same display.
    // Returning after another reel starts a new display.
    viewedReelRef.current = reel.id;
    const eventProps: ReelEventProps = {
      reel_id: reel.id, course_slug: reel.courseSlug || null, position: activeIndex,
    };
    track(EVENTS.reelViewed, eventProps);
  }, [isMobile, activeIndex, items]);

  // CSS shows the first poster on phones before the viewport effect can run.
  const firstItem = items[0];
  if (isMobile === null && firstItem) {
    const { title } = normalizeReel(firstItem.reel, { title: firstItem.reel.courseSlug });
    return (
      <section
        data-reel-placeholder={firstItem.reel.id}
        aria-label={title}
        className="md:hidden [@media(pointer:coarse)_and_(max-height:767px)]:block fixed inset-0 z-30 h-[100dvh] w-full overflow-hidden bg-black"
      >
        <img
          src={firstItem.poster}
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-8 pr-16">
          <h2 className="text-base font-semibold leading-snug text-white drop-shadow-md">{title}</h2>
        </div>
      </section>
    );
  }

  if (!isMobile) return null;

  return (
    <div
      ref={containerRef}
      className={`md:hidden [@media(pointer:coarse)_and_(max-height:767px)]:block fixed inset-0 z-30 h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory bg-black select-none ${
        prefersReducedMotion ? 'motion-reduce:scroll-auto' : 'scroll-smooth'
      }`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {items.map((item, index) => (
        <ReelPlayer
          key={item.reel.id}
          item={item}
          position={index}
          isActive={activeIndex === index}
          isMuted={isMuted}
          onToggleSound={() => setIsMuted((prev) => !prev)}
          prefersReducedMotion={prefersReducedMotion}
          isLoggedIn={isLoggedIn}
          exitHref={exitHref}
        />
      ))}
    </div>
  );
}
