// Чистая функция доступа — без server-only, нужна и в тестах
import type { Access, Subscription } from '@/lib/types';

// Доступ определяется на уровне урока; access курса — значение по умолчанию для новых уроков в админке
export function isLocked(
  lesson: { access: Access },
  sub: Subscription | null,
  now: number,
): boolean {
  const paid = lesson.access === 'paid';
  if (!paid) return false;
  const active =
    !!sub &&
    sub.status === 'active' &&
    sub.startsAt <= now &&
    (sub.expiresAt === null || sub.expiresAt > now);
  return !active;
}
