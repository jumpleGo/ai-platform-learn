'use client';

import React from 'react';
import { Heart, Share2 } from 'lucide-react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

export function ReelActions({ eventProps }: { eventProps: ReelEventProps }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        aria-label="Лайк"
        className="group flex flex-col items-center gap-1 text-white focus:outline-none"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-90 group-hover:bg-black/60">
          <Heart className="h-6 w-6 text-white" />
        </span>
        <span className="text-[11px] font-medium tracking-tight drop-shadow">Лайк</span>
      </button>

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
