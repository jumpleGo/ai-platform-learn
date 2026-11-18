'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import { ReelShareButton } from './reel-share-button';

const storageKey = (id: string) => `gelato:reel-liked:${id}`;
type LocalLikes = {
  liked: Record<string, boolean>;
  error: Record<string, string>;
  load: (id: string) => void;
  toggle: (props: ReelEventProps) => void;
};
const LocalLikesContext = createContext<LocalLikes | null>(null);

// Both viewport presentations share the browser's saved reaction; no API or count.
export function ReelLocalLikesProvider({ children }: { children: ReactNode }) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const lastClick = useRef<Record<string, number>>({});
  const load = useCallback((id: string) => {
    try {
      const saved = localStorage.getItem(storageKey(id)) === 'true';
      setLiked(previous => ({ ...previous, [id]: saved }));
    } catch {
      setLiked(previous => ({ ...previous, [id]: false }));
    }
  }, []);
  const toggle = useCallback((props: ReelEventProps) => {
    const id = props.reel_id;
    const now = performance.now();
    if (now - (lastClick.current[id] ?? -Infinity) < 300) return;
    lastClick.current[id] = now; // Includes rapid taps before React renders.
    try {
      const next = localStorage.getItem(storageKey(id)) !== 'true';
      localStorage.setItem(storageKey(id), String(next));
      setLiked(previous => ({ ...previous, [id]: next }));
      setError(previous => ({ ...previous, [id]: '' }));
      if (next) track(EVENTS.reelLiked, props);
    } catch {
      setError(previous => ({ ...previous, [id]: 'Не удалось сохранить лайк. Попробуйте ещё раз.' }));
    }
  }, []);
  return <LocalLikesContext.Provider value={{ liked, error, load, toggle }}>{children}</LocalLikesContext.Provider>;
}

export function ReelLocalActions({ eventProps }: { eventProps: ReelEventProps }) {
  const { liked, error, load, toggle } = useContext(LocalLikesContext)!;
  const id = eventProps.reel_id;
  useEffect(() => { load(id); }, [id, load]);
  return (
    <div className="flex flex-col items-center gap-4 text-white">
      <button type="button" aria-label="Нравится" aria-pressed={liked[id] ?? false}
        disabled={liked[id] === undefined} onClick={() => toggle(eventProps)}
        className="group flex flex-col items-center gap-1 focus-visible:outline-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-90 group-hover:bg-black/60">
          <Heart className={`h-6 w-6 ${liked[id] ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </span>
        <span className="text-[11px] font-medium drop-shadow">Нравится</span>
      </button>
      <ReelShareButton url={`/reels/${encodeURIComponent(id)}`} variant="overlay"
        onClick={() => track(EVENTS.reelShared, eventProps)} />
      {error[id] && <p role="status" className="max-w-28 rounded bg-black/70 p-2 text-xs">{error[id]}</p>}
    </div>
  );
}
