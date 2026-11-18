'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { ReelFeedItem } from './reel-player';

export function useReelFeedNavigation(
  containerRef: RefObject<HTMLElement | null>,
  items: ReelFeedItem[],
  enabled: boolean,
  prefersReducedMotion: boolean,
  initialReelId?: string,
) {
  const initialIndex = Math.max(0, items.findIndex(({ reel }) => reel.id === initialReelId));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const currentIndexRef = useRef(initialIndex);
  const requestedIndexRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const panels = Array.from(container.querySelectorAll<HTMLElement>('[data-reel-id]'));
    if (!panels.length) return;
    // A refresh or viewport rotation must open the reel in the address bar.
    const pathId = window.location.pathname.split('/')[2];
    const pathIndex = items.findIndex(({ reel }) => reel.id === pathId);
    const start = pathIndex >= 0 ? pathIndex : initialIndex;
    container.scrollTo({ top: panels[start].offsetTop - panels[0].offsetTop, behavior: 'instant' });
    currentIndexRef.current = start;
    requestedIndexRef.current = null;
    setActiveIndex(document.hidden ? -1 : start);

    if (typeof IntersectionObserver === 'undefined') return;
    const ratios = new Map<Element, number>();
    let disconnected = false;
    const selectVisible = () => {
      if (disconnected) return;
      let next = -1;
      let largest = 0.6;
      if (!document.hidden) {
        panels.forEach((panel, index) => {
          const ratio = ratios.get(panel) ?? 0;
          if (ratio >= largest) { next = index; largest = ratio; }
        });
      }
      if (next >= 0) {
        currentIndexRef.current = next;
        if (requestedIndexRef.current === next) requestedIndexRef.current = null;
      }
      // isIntersecting alone is true even for a mostly offscreen video.
      setActiveIndex(next);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
      selectVisible();
    }, { root: container, threshold: [0, 0.6, 1] });
    panels.forEach((panel) => observer.observe(panel));
    document.addEventListener('visibilitychange', selectVisible);
    return () => {
      disconnected = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', selectVisible);
    };
  }, [containerRef, enabled, items, initialIndex]);

  useEffect(() => {
    const container = containerRef.current;
    const item = items[activeIndex];
    if (!enabled || !container || !item) return;
    const path = `/reels/${encodeURIComponent(item.reel.id)}`;
    if (window.location.pathname !== path) {
      // Next's native history integration preserves its internal router state.
      window.history.replaceState(null, '', `${path}${window.location.search}`);
    }
    const panels = container.querySelectorAll<HTMLElement>('[data-reel-id]');
    panels.forEach((panel, index) => {
      const video = panel.querySelector('video');
      if (!video) return;
      const preload = Math.abs(index - activeIndex) <= 1 ? 'auto' : 'none';
      if (video.preload === preload) return;
      video.preload = preload;
      // Don't reset the playing video or a previously buffered neighbour.
      if (preload === 'auto' && index !== activeIndex) video.load();
    });
  }, [activeIndex, containerRef, enabled, items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const panels = Array.from(container.querySelectorAll<HTMLElement>('[data-reel-id]'));
    const resetRequest = () => { requestedIndexRef.current = null; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"], [role="dialog"]'))) return;
      event.preventDefault();
      const from = requestedIndexRef.current ?? currentIndexRef.current;
      const next = Math.max(0, Math.min(panels.length - 1, from + (event.key === 'ArrowDown' ? 1 : -1)));
      if (!panels[next]) return;
      requestedIndexRef.current = next;
      container.scrollTo({
        top: panels[next].offsetTop - panels[0].offsetTop,
        behavior: prefersReducedMotion ? 'instant' : 'smooth',
      });
    };
    window.addEventListener('keydown', onKeyDown);
    container.addEventListener('wheel', resetRequest, { passive: true });
    container.addEventListener('touchstart', resetRequest, { passive: true });
    container.addEventListener('pointerdown', resetRequest, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('wheel', resetRequest);
      container.removeEventListener('touchstart', resetRequest);
      container.removeEventListener('pointerdown', resetRequest);
    };
  }, [containerRef, enabled, items, prefersReducedMotion]);

  return activeIndex;
}
