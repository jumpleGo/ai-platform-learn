'use client';
import posthog from './posthog';
import { isBot } from './bot-detection';

// До загрузки SDK событие сохраняется в очереди обёртки. Для ботов отправку не производим.
export function track(event: string, props?: Record<string, unknown>) {
  if (isBot()) return;
  posthog.capture(event, props);
}

// Привязывает события к пользователю
export function identify(uid: string, props?: Record<string, unknown>) {
  if (isBot()) return;
  posthog.identify(uid, props);
}

// Сбрасывает привязку при выходе — иначе события следующего пользователя уйдут под старым uid
export function resetAnalytics() {
  if (isBot()) return;
  posthog.reset();
}
