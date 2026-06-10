// Чистая функция доступа — без server-only, нужна и в тестах
import type { Access, Subscription } from '@/lib/types';

export function isLocked(
  lesson: { access: Access },
  course: { access: Access },
  sub: Subscription | null,
  now: number,
): boolean {
  const paid = lesson.access === 'paid' || course.access === 'paid';
  if (!paid) return false;
  const active =
    !!sub &&
    sub.status === 'active' &&
    sub.startsAt <= now &&
    (sub.expiresAt === null || sub.expiresAt > now);
  return !active;
}
