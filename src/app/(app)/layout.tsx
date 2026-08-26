import Link from 'next/link';
import { Suspense } from 'react';
import { GelatoLogo } from '@/components/gelato-logo';
import { getSession } from '@/lib/session';
import { getRegisteredUsersCount } from '@/lib/db/stats';
import { LogoutButton } from '@/components/logout-button';
import { PartnerBar } from '@/components/partner-bar';
import { PresenceBar } from '@/components/presence-bar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // главная и страницы уроков доступны гостям; платный контент отдаётся заблокированным
  const [session, registered] = await Promise.all([getSession(), getRegisteredUsersCount()]);
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      {/* Suspense — полоса партнёра стримится и не блокирует переходы */}
      <Suspense fallback={null}>
        <PartnerBar />
      </Suspense>
      <header data-app-header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <GelatoLogo className="h-9 sm:h-11" />
          </Link>
          <div className="flex items-center gap-3">
            <PresenceBar registered={registered} />
            {session ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">{session.email}</span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <footer data-app-footer className="border-t border-border/70 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6">
          <span className="font-mono">GELATO</span>
          <span>Обучение ИИ-разработке с Claude Code</span>
        </div>
      </footer>
    </div>
  );
}
