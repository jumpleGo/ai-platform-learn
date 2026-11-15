'use client';

import React, { useEffect, useRef, useState } from 'react';
import { normalizeReel } from '@/lib/reels';
import { ReelPlayer, type ReelFeedItem } from './reel-player';

export type { ReelFeedItem };

type ReelsMobileFeedProps = {
  items: ReelFeedItem[];
};

export function ReelsMobileFeed({ items }: ReelsMobileFeedProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia) {
      setIsMobile(false);
      return;
    }
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsMobile(media.matches);
      // A remounted scroller starts at the first reel.
      setActiveIndex(0);
    };
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
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

  // CSS shows the first poster on phones before the viewport effect can run.
  const firstItem = items[0];
  if (isMobile === null && firstItem) {
    const { title } = normalizeReel(firstItem.reel, { title: firstItem.reel.courseSlug });
    return (
      <section
        data-reel-placeholder={firstItem.reel.id}
        aria-label={title}
        className="md:hidden fixed inset-0 z-30 h-[100dvh] w-full overflow-hidden bg-black"
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
      className={`md:hidden fixed inset-0 z-30 h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory bg-black select-none ${
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
          isActive={activeIndex === index}
          isMuted={isMuted}
          onToggleSound={() => setIsMuted((prev) => !prev)}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
    </div>
  );
}
