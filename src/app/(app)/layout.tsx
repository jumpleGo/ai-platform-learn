import Link from 'next/link';
import { Suspense } from 'react';
import { GelatoLogo } from '@/components/gelato-logo';
import { getSession } from '@/lib/session';
import { getRegisteredUsersCount } from '@/lib/db/stats';
import { LogoutButton } from '@/components/logout-button';
import { PartnerBar } from '@/components/partner-bar';
import { PresenceBar } from '@/components/presence-bar';
import { SiteNavDesktop, SiteNavMobile } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // главная и страницы уроков доступны гостям; платный контент отдаётся заблокированным
  const [session, registered] = await Promise.all([getSession(), getRegisteredUsersCount()]);

  // Блок аккаунта рендерится дважды: на широком экране справа в шапке, на узком —
  // внутри мобильной панели. Разметка одна, поэтому держим её отдельным узлом.
  const account = session ? (
    <>
      <span className="truncate text-sm text-muted-foreground">{session.email}</span>
      <LogoutButton />
    </>
  ) : (
    <Link
      href="/login"
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      Войти
    </Link>
  );

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      {/* Suspense — полоса партнёра стримится и не блокирует переходы */}
      <Suspense fallback={null}>
        <PartnerBar />
      </Suspense>
      <header data-app-header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-7">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <GelatoLogo className="h-9 sm:h-11" />
            </Link>
            <SiteNavDesktop authed={!!session} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <PresenceBar registered={registered} />
            <div className="hidden max-w-56 items-center gap-3 lg:flex">{account}</div>
            <SiteNavMobile authed={!!session}>{account}</SiteNavMobile>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
