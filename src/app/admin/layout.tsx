import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { GelatoLogo } from '@/components/gelato-logo';
import { getSession } from '@/lib/session';
import { AdminNav } from './admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // role приходит из custom claims, DecodedIdToken не знает это поле
  if ((session as { role?: string } | null)?.role !== 'admin') redirect('/');
  return (
    <div className="flex min-h-screen bg-sidebar">
      <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-sidebar-border px-4 py-6">
        <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-2 font-mono text-[15px] font-semibold tracking-tight">
          <GelatoLogo className="size-7" />
          GELATO
          <span className="rounded-full border border-sidebar-border bg-sidebar-accent px-2 py-0.5 font-sans text-[11px] font-medium text-muted-foreground">
            admin
          </span>
        </Link>
        <AdminNav />
        <Link
          href="/"
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          На сайт
        </Link>
      </aside>
      <main className="flex-1 rounded-l-3xl border-l border-sidebar-border bg-background px-8 py-8 shadow-sm">
        {children}
      </main>
    </div>
  );
}
