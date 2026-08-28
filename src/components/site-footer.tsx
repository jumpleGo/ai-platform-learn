import Link from 'next/link';
import { Send } from 'lucide-react';
import { GelatoLogo } from '@/components/gelato-logo';
import { LEGAL_NAV, NAV, TELEGRAM_CHANNEL, TELEGRAM_DM } from '@/lib/site';

// Подвал по эскизу: разделы сайта, два телеграма (личка и канал школы) и юр. документы.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer data-app-footer className="mt-20 border-t border-border/70 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="inline-flex">
            <GelatoLogo className="h-9 sm:h-11" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
            Школа про работу с&nbsp;ИИ: от&nbsp;первого промпта до&nbsp;проекта, который
            проверяет себя сам.
          </p>
        </div>

        <nav aria-label="Разделы" className="space-y-3">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Разделы</p>
          <ul className="space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Связаться</p>
          <ul className="space-y-2">
            <li>
              <a
                href={TELEGRAM_DM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                <Send className="size-3.5 text-primary" aria-hidden />
                Написать лично
              </a>
            </li>
            <li>
              <a
                href={TELEGRAM_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                <Send className="size-3.5 text-primary" aria-hidden />
                Канал школы
              </a>
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Отвечаем сами, без рассылок и&nbsp;автоответчиков.
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Документы</p>
          <ul className="space-y-2">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>© {year} GELATO</span>
          <span>Обучение работе с&nbsp;ИИ и&nbsp;Claude Code</span>
        </div>
      </div>
    </footer>
  );
}
