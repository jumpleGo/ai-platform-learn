import { getSession } from '@/lib/session';
import { toggleReelLike } from '@/lib/db/reels';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

const requestTimestamps = new Map<string, number[]>();

export function checkRateLimit(uid: string, now = Date.now()): boolean {
  const timestamps = requestTimestamps.get(uid) || [];
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = timestamps.filter((t) => t > cutoff);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestTimestamps.set(uid, recent);
    return false;
  }
  recent.push(now);
  requestTimestamps.set(uid, recent);
  return true;
}

export function resetRateLimit(): void {
  requestTimestamps.clear();
}

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const session = await getSession();
  if (!session || !session.uid) {
    return Response.json({ error: 'Войдите, чтобы поставить лайк.' }, { status: 401 });
  }

  if (!checkRateLimit(session.uid)) {
    return Response.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 });
  }

  const { id } = await context.params;
  if (!/^[\w-]{1,128}$/.test(id)) {
    return Response.json({ error: 'Рилс не найден.' }, { status: 404 });
  }

  const result = await toggleReelLike(id, session.uid);
  if (!result) {
    return Response.json({ error: 'Рилс не найден.' }, { status: 404 });
  }

  return Response.json(result);
}
