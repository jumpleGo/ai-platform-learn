// Minimal mounted reproduction from 5a751653cbab3adfe34fb2c0f70ef293bed567fc.
// Source: src/components/reels/reel-actions.tsx, SHA256: 53becf7e8621d3c8570692742a2bad978f9cfde1b08e31dbb0ccc7771e9935fe.
// handleLike is verbatim. Only decorative markup and the direct-call hook bypass
// are omitted; real useState preserves the original mounted behavior.
import React, { useState } from 'react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
export function OldReelActions({ eventProps, initialLikeCount = 0, initialLiked = false }:
  { eventProps: ReelEventProps; initialLikeCount?: number; initialLiked?: boolean }) {
  const reelId = eventProps.reel_id;
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
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

  return <button aria-label="Лайк" aria-pressed={liked} onClick={handleLike}>{likeCount}</button>;
}
