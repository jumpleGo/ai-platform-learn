// Константы и утилиты 24-часового таймера для тарифа вайбкодинга с поддержкой.
// Безопасен для импорта как в Server Components / API routes, так и в Client Components.

export const VIBE_TIMER_COOKIE = 'vibe_price_timer_end';
export const VIBE_TIMER_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

export const VIBE_STREAM_PROMO_PRICE = 19900;
export const VIBE_STREAM_REGULAR_PRICE = 24900;
export const VIBE_STREAM_OLD_PRICE = 27900;

/**
 * Читает или создаёт время окончания таймера из cookie (клиентская часть).
 */
export function getOrCreateVibeTimerExpiry(): number {
  if (typeof document === 'undefined') {
    return Date.now() + VIBE_TIMER_DURATION_MS;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${VIBE_TIMER_COOKIE}=(\\d+)`));
  if (match) {
    const val = Number(match[1]);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // Если куки нет — ставим на 24 часа вперёд с длительным Max-Age (30 дней),
  // чтобы после истечения timestamp в прошлом сохранялся и цена не сбрасывалась обратно.
  const newExpiry = Date.now() + VIBE_TIMER_DURATION_MS;
  document.cookie = `${VIBE_TIMER_COOKIE}=${newExpiry}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
  return newExpiry;
}

/**
 * Проверяет, истёк ли таймер по timestamp окончания.
 */
export function checkIsVibeTimerExpired(expiryTimestamp?: number | null): boolean {
  if (!expiryTimestamp) return false;
  return Date.now() >= expiryTimestamp;
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
