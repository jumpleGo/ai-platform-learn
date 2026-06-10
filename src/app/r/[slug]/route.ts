import { NextRequest, NextResponse } from 'next/server';

// Партнёрская ссылка /r/{slug}: ставит cookie атрибуции и ведёт на регистрацию
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = NextResponse.redirect(new URL('/register', req.url));
  // мусорный slug не пишем в cookie — иначе он осядет в partnerId профиля
  if (/^[a-z0-9-]{1,64}$/.test(slug)) {
    res.cookies.set('partner', slug, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  return res;
}
