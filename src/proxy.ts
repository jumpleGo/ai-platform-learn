import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/register', '/r/', '/api/'];

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const res = PUBLIC.some((p) => pathname.startsWith(p)) || req.cookies.has('session')
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', req.url));

  // сохраняем utm-метки с любого лендинга до момента регистрации
  const utm: Record<string, string> = {};
  for (const [k, v] of searchParams) if (k.startsWith('utm_')) utm[k] = v;
  if (Object.keys(utm).length) {
    res.cookies.set('utm', JSON.stringify(utm), { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  const ref = searchParams.get('ref');
  if (ref) res.cookies.set('partner', ref, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\.(?:png|jpg|svg|webp)).*)'] };
