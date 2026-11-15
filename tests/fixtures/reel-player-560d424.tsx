import React, { useEffect, useRef } from 'react';
import type { ReelPlayer } from '@/components/reels/reel-player';

export const OLD_REEL_PLAYER_COMMIT = '560d424b79c39c4466071dd6777c3ce05fe30fa6';

// Source: src/components/reels/reel-player.tsx at
// commit 560d424b79c39c4466071dd6777c3ce05fe30fa6.
// Source SHA-256: d328c9ce07b7b2da448ea5c2d4b1df794be33899bacd892e1cd4cf6520439a93.
// Only the viewport guard, ref, effect and click handler are retained; the
// unrelated overlay is replaced by the video needed to attach the ref.
// No git or remote-ref reads occur in tests.
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
}

export function ReelPlayer560d424({
  isActive, isMuted, prefersReducedMotion,
}: React.ComponentProps<typeof ReelPlayer>) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  return <video ref={videoRef} muted={isMuted} onClick={handleVideoClick} />;
}
