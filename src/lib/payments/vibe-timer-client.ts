'use client';

import { useState, useEffect } from 'react';
import {
  getOrCreateVibeTimerExpiry,
  formatVibeTimer,
  VIBE_TIMER_DURATION_MS,
  VIBE_STREAM_PROMO_PRICE,
  VIBE_STREAM_OLD_PRICE,
} from '@/lib/payments/vibe-timer';

export * from '@/lib/payments/vibe-timer';

/**
 * React-хук таймера спецпредложения на 2-й тариф вайбкодинга.
 * Когда отсчёт доходит до нуля, таймер перезапускается на новые 24 часа.
 */
export function useVibePriceTimer() {
  const [timeLeft, setTimeLeft] = useState<number>(VIBE_TIMER_DURATION_MS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let expiry = getOrCreateVibeTimerExpiry();
    setTimeLeft(Math.max(0, expiry - Date.now()));

    const interval = setInterval(() => {
      if (Date.now() >= expiry) {
        // Кука уже истекла — получаем свежий отсчёт и продолжаем
        expiry = getOrCreateVibeTimerExpiry();
      }
      setTimeLeft(Math.max(0, expiry - Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    mounted,
    timeLeft,
    formattedTime: formatVibeTimer(timeLeft),
    currentPrice: VIBE_STREAM_PROMO_PRICE,
    oldPrice: VIBE_STREAM_OLD_PRICE,
  };
}
