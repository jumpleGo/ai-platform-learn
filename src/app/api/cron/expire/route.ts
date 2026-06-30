import { NextResponse } from 'next/server';
import { expireOverdueSubscriptions } from '@/lib/db/subscriptions';

// Vercel Cron: помечает истёкшие подписки. Vercel шлёт Authorization: Bearer ${CRON_SECRET}.
// Если CRON_SECRET задан — требуем его; иначе (локально) пускаем без проверки.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const expired = await expireOverdueSubscriptions(Date.now());
  return NextResponse.json({ expired });
}
