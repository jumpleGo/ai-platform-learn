// Константы и утилиты 24-часового таймера спецпредложения для тарифа вайбкодинга с поддержкой.
// Таймер бесконечный: кука живёт ровно 24 часа, а когда она пропадает — отсчёт начинается заново.
// Безопасен для импорта как в Server Components / API routes, так и в Client Components.

export const VIBE_TIMER_COOKIE = 'vibe_price_timer_end';
export const VIBE_TIMER_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

export const VIBE_STREAM_PROMO_PRICE = 19900;
export const VIBE_STREAM_OLD_PRICE = 27900;

/**
 * Читает время окончания таймера из cookie. Если куки нет или её timestamp уже в прошлом
 * (например, старая кука с 30-дневным сроком) — ставит новую на 24 часа вперёд.
 */
export function getOrCreateVibeTimerExpiry(): number {
  if (typeof document === 'undefined') {
    return Date.now() + VIBE_TIMER_DURATION_MS;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${VIBE_TIMER_COOKIE}=(\\d+)`));
  if (match) {
    const val = Number(match[1]);
    if (!isNaN(val) && val > Date.now()) {
      return val;
    }
  }

  // Срок жизни куки совпадает с длительностью таймера: кука исчезает вместе с окончанием отсчёта
  const newExpiry = Date.now() + VIBE_TIMER_DURATION_MS;
  document.cookie = `${VIBE_TIMER_COOKIE}=${newExpiry}; max-age=${VIBE_TIMER_DURATION_MS / 1000}; path=/; SameSite=Lax`;
  return newExpiry;
}

/**
 * Форматирует оставшиеся миллисекунды в вид HH:MM:SS.
 */
export function formatVibeTimer(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
