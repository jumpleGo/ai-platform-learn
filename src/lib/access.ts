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

// Доступ к курсу целиком: действующая подписка, которая покрывает этот курс.
// Нужен витринам и лендингу — на уровне отдельного урока решает isLocked.
// Ограниченная подписка: courseIds — массив конкретных курсов; null/отсутствует — все курсы
export function hasCourseAccess(courseId: string, sub: Subscription | null, now: number): boolean {
  if (!isSubscriptionActive(sub, now)) return false;
  return !Array.isArray(sub!.courseIds) || sub!.courseIds.includes(courseId);
}

// Доступ определяется на уровне урока; access курса — значение по умолчанию для новых уроков в админке
export function isLocked(
  lesson: { access: Access; courseId?: string },
  sub: Subscription | null,
  now: number,
): boolean {
  if (lesson.access !== 'paid') return false;
  return !hasCourseAccess(lesson.courseId ?? '', sub, now);
}

// Урок снят с публикации в админке. У уроков, созданных до появления поля, его нет —
// такие считаем опубликованными
export function isLessonPublished(lesson: { published?: boolean }): boolean {
  return lesson.published !== false;
}
