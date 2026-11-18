'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { GelatoLogo } from '@/components/gelato-logo';
import { normalizeReel, type Reel } from '@/lib/reels';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import { ReelActions } from './reel-actions';
import { ReelLocalActions } from './reel-local-actions';
import { ReelCta } from './reel-cta';

export type ReelFeedItem = {
  reel: Reel;
  video: string;
  poster: string;
};

export const REELS_LANDSCAPE_QUERY = '(pointer: coarse) and (max-height: 767px)';

type ReelPlayerProps = {
  item: ReelFeedItem;
  position?: number;
  isActive: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  prefersReducedMotion: boolean;
  isLoggedIn?: boolean;
  exitHref?: string;
  localLikes?: boolean;
};

function isMobileViewport() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(max-width: 767px)').matches
    || window.matchMedia?.(REELS_LANDSCAPE_QUERY).matches);
}

export function ReelPlayer({
  item,
  position = 0,
  isActive,
  isMuted,
  onToggleSound,
  prefersReducedMotion,
  isLoggedIn,
  exitHref,
  localLikes,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isManuallyPausedRef = useRef(false);
  const completedRef = useRef(false);
  const previousTimeRef = useRef(0);
  const { title } = normalizeReel(item.reel, { title: item.reel.courseSlug });
  const eventProps: ReelEventProps = {
    reel_id: item.reel.id, course_slug: item.reel.courseSlug || null, position,
  };

  useEffect(() => {
    completedRef.current = false;
    previousTimeRef.current = 0;
  }, [isActive, item.reel.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && isMobileViewport() && !prefersReducedMotion && !isManuallyPausedRef.current) {
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
  }, [isActive, prefersReducedMotion]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video || !isActive || !isMobileViewport()) return;
    if (video.paused) {
      isManuallyPausedRef.current = false;
      video.play().catch(() => {});
    } else {
      isManuallyPausedRef.current = true;
      video.pause();
    }
  };

  const handleComplete = () => {
    if (!isActive || completedRef.current) return;
    completedRef.current = true;
    track(EVENTS.reelCompleted, eventProps);
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!isActive || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return;
    // A looping video does not fire ended: detect its return from the final
    // part to the start, then count only the first completed loop per display.
    if (previousTimeRef.current >= video.duration * 0.9 && video.currentTime < previousTimeRef.current) {
      handleComplete();
    }
    previousTimeRef.current = video.currentTime;
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
        role="button"
        tabIndex={0}
        aria-label="Пауза или воспроизведение"
        onClick={handleVideoClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleVideoClick();
          }
        }}
        onEnded={handleComplete}
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full object-cover"
      />

      {/* Top bar with logo and sound button */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/30 to-transparent p-4 pt-6"
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))', paddingInline: 'max(1rem, env(safe-area-inset-left), env(safe-area-inset-right))' }}>
        <Link
          href={exitHref ?? '/'}
          aria-label={exitHref ? 'Все короткие видео' : 'GELATO, на главную'}
          className="pointer-events-auto text-white drop-shadow transition-opacity hover:opacity-80"
          style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center' }}
        >
          {exitHref ? <ArrowLeft className="h-6 w-6" /> : <GelatoLogo className="h-8 text-white" />}
        </Link>
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90 hover:bg-black/60"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-24 z-20"
        style={{ right: 'calc(0.75rem + env(safe-area-inset-right))', bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {localLikes ? <ReelLocalActions eventProps={eventProps} /> : <ReelActions
          eventProps={eventProps}
          reelId={item.reel.id}
          initialLikeCount={item.reel.likeCount ?? 0}
          isLoggedIn={isLoggedIn}
        />}
      </div>

      {/* Bottom info and course CTA */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-8 pr-16"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))', paddingLeft: 'calc(1rem + env(safe-area-inset-left))' }}>
        <div className="pointer-events-auto">
          <ReelCta title={title} courseSlug={item.reel.courseSlug} eventProps={eventProps} />
        </div>
      </div>
    </section>
  );
}
