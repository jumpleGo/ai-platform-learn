import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/register', '/r/', '/api/', '/courses'];

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // главная ('/') открыта гостям — точное совпадение, чтобы не распахнуть весь сайт через startsWith
  const isPublic = pathname === '/' || PUBLIC.some((p) => pathname.startsWith(p));
  const res = isPublic || req.cookies.has('session')
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', req.url));

  // сохраняем utm-метки с любого лендинга до момента регистрации
  const utm: Record<string, string> = {};
  for (const [k, v] of searchParams) if (k.startsWith('utm_')) utm[k] = v;
  if (Object.keys(utm).length) {
    res.cookies.set('utm', JSON.stringify(utm), { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  const ref = searchParams.get('ref');
  // мусорный ref не пишем в cookie — тот же guard, что в /r/[slug]
  if (ref && /^[a-z0-9-]{1,64}$/.test(ref)) {
    res.cookies.set('partner', ref, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  return res;
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\.(?:png|jpg|svg|webp)).*)'] };
