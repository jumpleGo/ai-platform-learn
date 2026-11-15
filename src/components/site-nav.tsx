'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { isNavActive, navItems } from '@/lib/site';

// Пункт шапки. Активный выделяем только начертанием и цветом текста — шапка
// полупрозрачная, любые линии и заливки на ней читаются как артефакт.
function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavActive(href, pathname);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`py-1 text-sm whitespace-nowrap transition-colors ${
        active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteNavDesktop({ authed }: { authed: boolean }) {
  return (
    <nav aria-label="Разделы сайта" className="hidden items-center gap-6 lg:flex">
      {navItems(authed).map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}

// Мобильное меню: бургер и выпадающая панель. Внутрь панели прокидываем блок
// аккаунта из серверного лейаута — на узком экране он больше некуда не влезает.
export function SiteNavMobile({ authed, children }: { authed: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Смена маршрута закрывает панель: якорь на главную не размонтирует компонент
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card/60 text-foreground transition-colors hover:border-primary/40"
      >
        {open ? <X className="size-4.5" aria-hidden /> : <Menu className="size-4.5" aria-hidden />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background/97 backdrop-blur-md">
          <nav aria-label="Разделы сайта" className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
            {navItems(authed).map((item) => (
              <NavLink key={item.href} {...item} onNavigate={() => setOpen(false)} />
            ))}
            <div className="flex items-center gap-3 border-t border-border pt-4">{children}</div>
          </nav>
        </div>
      )}
    </div>
  );
}
