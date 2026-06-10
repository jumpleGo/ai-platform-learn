import { grantSubscription } from '@/lib/db/subscriptions';
import { EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/posthog-server';

// Generic-endpoint: адаптер конкретной платёжки (ЮKassa/Stripe/...) добавится отдельно
export async function POST(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { uid?: unknown; plan?: unknown; periodDays?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }
  const { uid, plan, periodDays } = body;
  if (
    typeof uid !== 'string' ||
    !/^[\w-]+$/.test(uid) ||
    typeof plan !== 'string' ||
    typeof periodDays !== 'number' ||
    periodDays <= 0
  ) {
    return Response.json({ error: 'invalid payload' }, { status: 400 });
  }
  await grantSubscription(uid, {
    status: 'active',
    plan,
    source: 'payment',
    startsAt: Date.now(),
    expiresAt: Date.now() + periodDays * 86_400_000,
    grantedBy: null,
  });
  await trackServer(uid, EVENTS.subscriptionActivated, { plan, source: 'payment' });
  return Response.json({ ok: true });
}
