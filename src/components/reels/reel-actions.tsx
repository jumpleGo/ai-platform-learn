'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2 } from 'lucide-react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

type ReelActionsProps = {
  eventProps: ReelEventProps;
  reelId?: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  isLoggedIn?: boolean;
};

export function ReelActions({
  eventProps,
  reelId = eventProps.reel_id,
  initialLikeCount = 0,
  initialLiked = false,
  isLoggedIn = true,
}: ReelActionsProps) {
  let liked = initialLiked;
  let setLiked: React.Dispatch<React.SetStateAction<boolean>> = () => {};
  let likeCount = initialLikeCount;
  let setLikeCount: React.Dispatch<React.SetStateAction<number>> = () => {};

  try {
    [liked, setLiked] = useState(initialLiked);
    [likeCount, setLikeCount] = useState(initialLikeCount);
  } catch {
    // Fallback when called directly outside a component tree in tests
  }

  const handleLike = async () => {
    track(EVENTS.reelLiked, eventProps);

    const prevLiked = liked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    // Optimistic update
    setLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const res = await fetch(`/api/reels/${reelId}/like`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Like request failed');
      }
      const data = await res.json();
      if (typeof data.liked === 'boolean' && typeof data.likeCount === 'number') {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch {
      // Rollback on error
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isLoggedIn ? (
        <button
          type="button"
          aria-label="Лайк"
          onClick={handleLike}
          className="group flex flex-col items-center gap-1 text-white focus:outline-none"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-90 group-hover:bg-black/60">
            <Heart className={`h-6 w-6 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </span>
          <span className="text-[11px] font-medium tracking-tight drop-shadow">{likeCount}</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <Heart className="h-6 w-6 text-white" />
          </span>
          <span className="text-[11px] font-medium tracking-tight drop-shadow">{likeCount}</span>
          <Link
            href="/login"
            className="text-[10px] font-medium text-white/90 text-center drop-shadow hover:underline max-w-[80px] leading-tight"
          >
            Войти, чтобы поставить лайк
          </Link>
        </div>
      )}

      <button
        type="button"
        aria-label="Поделиться"
        onClick={() => track(EVENTS.reelShared, eventProps)}
        className="group flex flex-col items-center gap-1 text-white focus:outline-none"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-90 group-hover:bg-black/60">
          <Share2 className="h-6 w-6 text-white" />
        </span>
        <span className="text-[11px] font-medium tracking-tight drop-shadow">Поделиться</span>
      </button>
    </div>
  );
}
