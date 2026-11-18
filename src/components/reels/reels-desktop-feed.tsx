'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { REELS_LANDSCAPE_QUERY, type ReelFeedItem } from './reel-player';
import { useReelFeedNavigation } from './use-reel-feed-navigation';

export function ReelsDesktopFeed({ items, initialReelId, children }: {
  items: ReelFeedItem[];
  initialReelId?: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const landscape = window.matchMedia(REELS_LANDSCAPE_QUERY);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setEnabled(!mobile.matches && !landscape.matches);
      setReducedMotion(motion.matches);
    };
    update();
    for (const media of [mobile, landscape, motion]) media.addEventListener('change', update);
    return () => { for (const media of [mobile, landscape, motion]) media.removeEventListener('change', update); };
  }, []);
  const activeIndex = useReelFeedNavigation(containerRef, items, enabled, reducedMotion, initialReelId);
  useEffect(() => {
    const videos = containerRef.current?.querySelectorAll('video');
    if (!enabled || !videos) return;
    videos.forEach((video, index) => {
      if (index === activeIndex && !reducedMotion) video.play()?.catch(() => {});
      else video.pause();
    });
    return () => videos.forEach((video) => video.pause());
  }, [activeIndex, enabled, reducedMotion]);
  return (
    <main ref={containerRef} data-reel-feed="desktop"
      className="relative min-h-0 flex-1 overflow-y-scroll overscroll-y-contain snap-y snap-mandatory h-[calc(100dvh-3.5rem)]">
      {children}
    </main>
  );
}
