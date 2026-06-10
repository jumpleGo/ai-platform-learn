import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

// cache — один verifySessionCookie на запрос (layout и page делят результат)
export const getSession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value;
  if (!cookie) return null;
  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
});
