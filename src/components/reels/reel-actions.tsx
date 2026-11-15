'use client';

import React from 'react';
import { Heart, Share2 } from 'lucide-react';

export function ReelActions() {
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
