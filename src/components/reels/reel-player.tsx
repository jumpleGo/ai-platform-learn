'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import { GelatoLogo } from '@/components/gelato-logo';
import { normalizeReel, type Reel } from '@/lib/reels';
import { ReelActions } from './reel-actions';
import { ReelCta } from './reel-cta';

export type ReelFeedItem = {
  reel: Reel;
  video: string;
  poster: string;
};

type ReelPlayerProps = {
  item: ReelFeedItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  prefersReducedMotion: boolean;
};

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
}

export function ReelPlayer({
  item,
  isActive,
  isMuted,
  onToggleSound,
  prefersReducedMotion,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { title } = normalizeReel(item.reel, { title: item.reel.courseSlug });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;

    if (isActive && isMobileViewport() && !prefersReducedMotion) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay might be gated by browser policy before interaction
        });
      }
    } else {
      video.pause();
    }

    return () => video.pause();
  }, [isActive, isMuted, prefersReducedMotion]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video || !isActive || !isMobileViewport()) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <section
      data-reel-id={item.reel.id}
      aria-label={title}
      className="relative flex h-[100dvh] w-full snap-start snap-always items-center justify-center overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        src={item.video}
        poster={item.poster}
        playsInline
        loop
        preload="none"
        muted={isMuted}
        onClick={handleVideoClick}
        className="h-full w-full object-cover"
      />

      {/* Top bar with logo and sound button */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/30 to-transparent p-4 pt-6">
        <Link
          href="/"
          aria-label="GELATO, на главную"
          className="pointer-events-auto text-white drop-shadow transition-opacity hover:opacity-80"
        >
          <GelatoLogo className="h-8 text-white" />
        </Link>
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90 hover:bg-black/60"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Right side action stub buttons (like, share) */}
      <div className="absolute right-3 bottom-24 z-20">
        <ReelActions />
      </div>

      {/* Bottom info and course CTA */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-8 pr-16">
        <div className="pointer-events-auto">
          <ReelCta title={title} courseSlug={item.reel.courseSlug} />
        </div>
      </div>
    </section>
  );
}
