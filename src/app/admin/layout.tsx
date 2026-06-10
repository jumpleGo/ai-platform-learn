import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // role приходит из custom claims, DecodedIdToken не знает это поле
  if ((session as { role?: string } | null)?.role !== 'admin') redirect('/');
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r px-4 py-6">
        <div className="mb-6 font-semibold">Админка</div>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin/courses">Курсы</Link>
          <Link href="/admin/users">Пользователи</Link>
          <Link href="/admin/partners">Партнёры</Link>
        </nav>
        <Link href="/" className="mt-auto text-sm text-muted-foreground">← На сайт</Link>
      </aside>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
