import 'server-only';
import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  // flushAt: 1 + flushInterval: 0 — каждое событие шлётся сразу (serverless-среда,
  // отложенные батчи теряются при завершении инстанса)
  client ??= new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

// Серверная отправка события; ошибки аналитики не должны ломать бизнес-логику
export async function trackServer(
  distinctId: string,
  event: string,
  props?: Record<string, unknown>,
) {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties: props });
    await ph.flush();
  } catch (err) {
    console.error('posthog trackServer error:', err);
  }
}
