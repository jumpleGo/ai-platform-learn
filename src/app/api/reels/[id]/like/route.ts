import { getSession } from '@/lib/session';
import { getReelLikeState, toggleReelLike } from '@/lib/db/reels';
import { checkRateLimit } from '@/lib/reel-like-rate-limit';

export const runtime = 'nodejs';

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

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[\w-]{1,128}$/.test(id)) {
    return Response.json({ error: 'Рилс не найден.' }, { status: 404 });
  }
  const session = await getSession();
  const state = await getReelLikeState(id, session?.uid);
  if (!state) return Response.json({ error: 'Рилс не найден.' }, { status: 404 });
  return Response.json({ ...state, isLoggedIn: Boolean(session?.uid) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
