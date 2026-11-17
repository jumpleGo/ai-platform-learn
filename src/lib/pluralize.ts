/**
 * Склонение слова «день» по числу:
 * 1, 21, 101 → «день»
 * 2–4, 22–24 → «дня»
 * 0, 5–20, 11–14, 25, 111 → «дней»
 */
export function pluralizeDays(count: number): string {
  const abs = Math.abs(Math.trunc(count));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod10 === 1 && mod100 !== 11) {
    return 'день';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'дня';
  }
  return 'дней';
}
