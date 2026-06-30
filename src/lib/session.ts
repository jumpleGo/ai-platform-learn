import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

// cache — один verifySessionCookie на запрос (layout и page делят результат).
// checkRevoked=false: иначе каждая навигация ждёт сетевой запрос к Firebase Auth (~100-300ms);
// логаут у нас удаляет cookie, так что ревокация на каждый запрос не нужна
export const getSession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value;
  if (!cookie) return null;
  try {
    return await adminAuth.verifySessionCookie(cookie, false);
  } catch {
    return null;
  }
});
