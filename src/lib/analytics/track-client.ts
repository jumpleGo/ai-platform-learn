'use client';
import posthog from './posthog';

// До загрузки SDK событие сохраняется в очереди обёртки.
export function track(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}

// Привязывает события к пользователю
export function identify(uid: string, props?: Record<string, unknown>) {
  posthog.identify(uid, props);
}

// Сбрасывает привязку при выходе — иначе события следующего пользователя уйдут под старым uid
export function resetAnalytics() {
  posthog.reset();
}
