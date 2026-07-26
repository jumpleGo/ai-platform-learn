// Чистая функция доступа — без server-only, нужна и в тестах
import type { Access, Subscription } from '@/lib/types';

// Подписка действует: статус активен и текущий момент внутри периода
export function isSubscriptionActive(sub: Subscription | null, now: number): boolean {
  return (
    !!sub &&
    sub.status === 'active' &&
    sub.startsAt <= now &&
    (sub.expiresAt === null || sub.expiresAt > now)
  );
}

// Доступ определяется на уровне урока; access курса — значение по умолчанию для новых уроков в админке
export function isLocked(
  lesson: { access: Access; courseId?: string },
  sub: Subscription | null,
  now: number,
): boolean {
  const paid = lesson.access === 'paid';
  if (!paid) return false;
  if (!isSubscriptionActive(sub, now)) return true;
  // Ограниченная подписка: courseIds — массив конкретных курсов; null/отсутствует — все курсы
  if (Array.isArray(sub!.courseIds) && !sub!.courseIds.includes(lesson.courseId ?? '')) return true;
  return false;
}
