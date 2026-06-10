'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics/track-client';

// Отправляет событие аналитики один раз при монтировании; ничего не рендерит
export function TrackOnMount({ event, props }: {
  event: string;
  props?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(event, props);
    // отправляем только при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
