import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const { idToken } = await req.json();
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: WEEK_MS });
  (await cookies()).set('session', sessionCookie, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: WEEK_MS / 1000, path: '/',
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete('session');
  return Response.json({ ok: true });
}
