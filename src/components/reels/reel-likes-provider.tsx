'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

type Reaction = { liked: boolean; likeCount: number; isLoggedIn: boolean };
type Entry = Partial<Reaction> & { status: 'loading' | 'ready' | 'saving' | 'error'; error?: string };
type Likes = {
  entries: Record<string, Entry>;
  load: (id: string) => Promise<void>;
  toggle: (id: string, props: ReelEventProps) => Promise<void>;
};
export const ReelLikesContext = createContext<Likes | null>(null);

class ReactionRequestError extends Error {
  constructor(readonly status: number) { super('Reaction request failed'); }
}

async function readResponse(response: Response, isLoggedIn?: boolean): Promise<Reaction> {
  if (!response.ok) throw new ReactionRequestError(response.status);
  const data = await response.json();
  data.isLoggedIn ??= isLoggedIn;
  if (typeof data.liked !== 'boolean' || !Number.isSafeInteger(data.likeCount)
    || data.likeCount < 0 || typeof data.isLoggedIn !== 'boolean') {
    throw new Error('Invalid reaction response');
  }
  return data;
}

async function request(id: string, method: 'GET' | 'POST' = 'GET') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`/api/reels/${encodeURIComponent(id)}/like`, {
      method, cache: 'no-store', signal: controller.signal,
    });
    return await readResponse(response, method === 'POST' ? true : undefined);
  } finally {
    clearTimeout(timeout);
  }
}

// Both viewport presentations share one confirmed state and one in-flight
// request per reel. A resize cannot start a second toggle or revive stale data.
export function ReelLikesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const confirmed = useRef<Record<string, Entry>>({});
  const pending = useRef(new Set<string>());
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; pending.current.clear(); }, []);

  const publish = useCallback((id: string, entry: Entry) => {
    confirmed.current = { ...confirmed.current, [id]: entry };
    setEntries(confirmed.current);
  }, []);
  const load = useCallback(async (id: string) => {
    if (pending.current.has(id) || confirmed.current[id]?.status === 'ready') return;
    pending.current.add(id);
    const version = generation.current;
    publish(id, { ...confirmed.current[id], status: 'loading', error: undefined });
    try {
      const reaction = await request(id);
      if (version === generation.current) publish(id, { ...reaction, status: 'ready' });
    } catch {
      if (version === generation.current) publish(id, {
        ...confirmed.current[id], status: 'error', error: 'Не удалось загрузить лайк.',
      });
    } finally {
      if (version === generation.current) pending.current.delete(id);
    }
  }, [publish]);

  const toggle = useCallback(async (id: string, props: ReelEventProps) => {
    const previous = confirmed.current[id];
    if (pending.current.has(id) || previous?.status !== 'ready' || !previous.isLoggedIn) return;
    pending.current.add(id); // Synchronous guard, including clicks before React renders.
    const version = generation.current;
    publish(id, { ...previous, status: 'saving', error: undefined });
    try {
      const data = await request(id, 'POST');
      if (version !== generation.current) return;
      publish(id, { ...data, status: 'ready' });
      if (data.liked) track(EVENTS.reelLiked, props);
    } catch (cause) {
      if (version !== generation.current) return;
      if (cause instanceof ReactionRequestError && (cause.status === 401 || cause.status === 429)) {
        publish(id, {
          ...previous, status: 'ready',
          isLoggedIn: cause.status === 401 ? false : previous.isLoggedIn,
          error: cause.status === 401 ? 'Войдите, чтобы поставить лайк.' : 'Слишком много запросов. Попробуйте позже.',
        });
        return;
      }
      // A lost response may follow a committed transaction. Read it back rather
      // than invert the UI or retry a non-idempotent toggle.
      const error = 'Не удалось подтвердить действие. Состояние лайка проверено повторно.';
      try {
        const data = await request(id);
        if (version === generation.current) publish(id, { ...data, status: 'ready', error });
      } catch {
        if (version === generation.current) publish(id, {
          ...previous, status: 'error', error: 'Не удалось проверить лайк. Повторите загрузку.',
        });
      }
    } finally {
      if (version === generation.current) pending.current.delete(id);
    }
  }, [publish]);

  return <ReelLikesContext.Provider value={{ entries, load, toggle }}>{children}</ReelLikesContext.Provider>;
}
