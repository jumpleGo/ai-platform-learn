'use client';

import { useState, useEffect } from 'react';
import {
  getOrCreateVibeTimerExpiry,
  formatVibeTimer,
  VIBE_TIMER_DURATION_MS,
  VIBE_STREAM_PROMO_PRICE,
  VIBE_STREAM_REGULAR_PRICE,
  VIBE_STREAM_OLD_PRICE,
} from '@/lib/payments/vibe-timer';

export * from '@/lib/payments/vibe-timer';

/**
 * React-хук для таймера скидки на 2-й тариф вайбкодинга.
 */
export function useVibePriceTimer() {
  const [expiry, setExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(VIBE_TIMER_DURATION_MS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const exp = getOrCreateVibeTimerExpiry();
    setExpiry(exp);
    setTimeLeft(Math.max(0, exp - Date.now()));

    const interval = setInterval(() => {
      const remaining = Math.max(0, exp - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const isExpired = mounted && timeLeft <= 0;
  const currentPrice = isExpired ? VIBE_STREAM_REGULAR_PRICE : VIBE_STREAM_PROMO_PRICE;

  return {
    mounted,
    timeLeft,
    isExpired,
    formattedTime: formatVibeTimer(timeLeft),
    currentPrice,
    oldPrice: VIBE_STREAM_OLD_PRICE,
  };
}
