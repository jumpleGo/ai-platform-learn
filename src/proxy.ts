import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/register', '/r/', '/api/', '/courses', '/waitlist'];

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // главная ('/') открыта гостям — точное совпадение, чтобы не распахнуть весь сайт через startsWith
  const isPublic = pathname === '/' || PUBLIC.some((p) => pathname.startsWith(p));
  // id посетителя для A/B-теста баннеров: живёт год, гостям тоже нужен.
  // Свежий id прокидываем в заголовок запроса — иначе первый рендер его не увидит
  // и все новые посетители получили бы один и тот же вариант.
  const known = req.cookies.get('vid')?.value;
  const vid = known && /^[\w-]{8,64}$/.test(known) ? null : crypto.randomUUID();
  const headers = new Headers(req.headers);
  if (vid) headers.set('cookie', [req.headers.get('cookie'), `vid=${vid}`].filter(Boolean).join('; '));

  const res = isPublic || req.cookies.has('session')
    ? NextResponse.next({ request: { headers } })
    : NextResponse.redirect(new URL('/login', req.url));
  if (vid) res.cookies.set('vid', vid, { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' });

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
