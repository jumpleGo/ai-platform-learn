'use client';

import { useEffect } from 'react';
import posthog from '@/lib/analytics/posthog';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import type { HomeVariant } from '@/lib/home-experiment';

// Отмечает, какую главную увидел посетитель. Вариант уходит ещё и супер-свойством:
// им помечаются все последующие события, поэтому воронку до регистрации и оплаты
// можно разрезать по вариантам, а не только считать просмотры.
export function HomeVariantAnalytics({ variant }: { variant: HomeVariant }) {
  useEffect(() => {
    posthog.register({ home_variant: variant });
    track(EVENTS.homeViewed, { variant });
  }, [variant]);

  return null;
}
