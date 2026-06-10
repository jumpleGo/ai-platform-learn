import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

export async function getSession() {
  const cookie = (await cookies()).get('session')?.value;
  if (!cookie) return null;
  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
