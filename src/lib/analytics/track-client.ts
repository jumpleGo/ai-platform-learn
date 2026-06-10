'use client';
import posthog from 'posthog-js';

// Отправляет событие, если posthog инициализирован; иначе no-op
export function track(event: string, props?: Record<string, unknown>) {
  if (posthog.__loaded) posthog.capture(event, props);
}

// Привязывает события к пользователю
export function identify(uid: string, props?: Record<string, unknown>) {
  if (posthog.__loaded) posthog.identify(uid, props);
}

// Сбрасывает привязку при выходе — иначе события следующего пользователя уйдут под старым uid
export function resetAnalytics() {
  if (posthog.__loaded) posthog.reset();
}
