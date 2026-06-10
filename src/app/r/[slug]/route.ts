import { NextRequest, NextResponse } from 'next/server';

// Партнёрская ссылка /r/{slug}: ставит cookie атрибуции и ведёт на регистрацию
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = NextResponse.redirect(new URL('/register', req.url));
  res.cookies.set('partner', slug, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}
