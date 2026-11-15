'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ReelPlayer, type ReelFeedItem } from './reel-player';

export type { ReelFeedItem };

type ReelsMobileFeedProps = {
  items: ReelFeedItem[];
};

export function ReelsMobileFeed({ items }: ReelsMobileFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!container || typeof IntersectionObserver === 'undefined') return;

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
  }, [items.length]);

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
