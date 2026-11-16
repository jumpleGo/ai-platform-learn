'use client';

import React, { useContext, useEffect } from 'react';
import { ReelLikesContext, ReelLikesProvider } from './reel-likes-provider';
import { ReelShareButton } from './reel-share-button';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

type ReelActionsProps = {
  eventProps: ReelEventProps;
  reelId?: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  isLoggedIn?: boolean;
  layout?: 'overlay' | 'inline' | 'desktop';
};

export function ReelActions(props: ReelActionsProps) {
  const likes = useContext(ReelLikesContext);
  if (!likes) return <ReelLikesProvider><ReelActions {...props} /></ReelLikesProvider>;
  return <ReelLikeControls {...props} />;
}

function ReelLikeControls({
  eventProps,
  reelId = eventProps.reel_id,
  initialLikeCount = 0,
  initialLiked = false,
  isLoggedIn,
  layout = 'overlay',
}: ReelActionsProps) {
  const { entries, load, toggle } = useContext(ReelLikesContext)!;
  const state = entries[reelId];
  useEffect(() => { void load(reelId); }, [load, reelId]);
  const liked = state?.liked ?? initialLiked;
  const likeCount = state?.likeCount ?? initialLikeCount;
  const guest = (state?.isLoggedIn ?? isLoggedIn) === false;
  const busy = !state || state.status === 'loading' || state.status === 'saving';
  const handleLike = () => { void toggle(reelId, eventProps); };

  return (
    <div className={layout === 'inline' ? 'flex items-center gap-4 text-foreground' : layout === 'desktop' ? 'flex flex-col items-center gap-4 text-foreground' : 'flex flex-col items-center gap-4 text-white'}>
      {!guest ? (
        <button
          type="button"
          aria-label="Лайк"
          aria-pressed={liked}
          aria-busy={busy}
          disabled={state?.status !== 'ready'}
          onClick={handleLike}
          className="group flex flex-col items-center gap-1 focus-visible:outline-2 disabled:cursor-wait"
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90 ${
            layout === 'desktop'
              ? 'bg-muted hover:bg-muted/80 text-foreground'
              : 'bg-black/40 backdrop-blur-sm group-hover:bg-black/60'
          }`}>
            <Heart className={`h-6 w-6 transition-colors ${liked ? 'fill-red-500 text-red-500' : layout === 'desktop' ? 'text-foreground' : 'text-white'}`} />
          </span>
          <span className={`text-[11px] font-medium tracking-tight ${layout === 'desktop' ? 'text-foreground' : 'drop-shadow'}`}>{likeCount}</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${
            layout === 'desktop' ? 'bg-muted text-foreground' : 'bg-black/40 backdrop-blur-sm'
          }`}>
            <Heart className={`h-6 w-6 ${layout === 'desktop' ? 'text-foreground' : 'text-white'}`} />
          </span>
          <span className={`text-[11px] font-medium tracking-tight ${layout === 'desktop' ? 'text-foreground' : 'drop-shadow'}`}>{likeCount}</span>
          <Link
            href="/login"
            className={`text-[10px] font-medium text-center hover:underline max-w-[80px] leading-tight ${
              layout === 'desktop' ? 'text-muted-foreground' : 'drop-shadow'
            }`}
          >
            Войти, чтобы поставить лайк
          </Link>
        </div>
      )}

      {state?.error && <div className="max-w-44 text-xs">
        <p role="status">{state.error}</p>
        {state.status === 'error' && <button type="button" className="underline" onClick={() => void load(reelId)}>Повторить загрузку</button>}
      </div>}

      {(layout === 'overlay' || layout === 'desktop') && <ReelShareButton
        url={`/reels/${encodeURIComponent(reelId)}`}
        variant="overlay"
        className={layout === 'desktop' ? 'group flex flex-col items-center gap-1 text-foreground focus-visible:outline-2' : undefined}
        onClick={() => track(EVENTS.reelShared, eventProps)}
      />}
    </div>
  );
}
