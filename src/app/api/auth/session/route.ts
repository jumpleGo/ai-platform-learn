import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  // битый JSON, отсутствующий или невалидный idToken — это ошибка клиента, а не сервера
  try {
    const { idToken } = await req.json();
    if (typeof idToken !== 'string' || !idToken) {
      return Response.json({ error: 'invalid token' }, { status: 401 });
    }
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: WEEK_MS });
    (await cookies()).set('session', sessionCookie, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: WEEK_MS / 1000, path: '/',
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'invalid token' }, { status: 401 });
  }
}

export async function DELETE() {
  (await cookies()).delete('session');
  return Response.json({ ok: true });
}
