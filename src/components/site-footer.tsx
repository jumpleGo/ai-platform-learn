import Link from 'next/link';
import { Send } from 'lucide-react';
import { GelatoLogo } from '@/components/gelato-logo';
import { LEGAL_NAV, NAV, TELEGRAM_CHANNEL, TELEGRAM_DM } from '@/lib/site';

// Подвал по эскизу: разделы сайта, два телеграма (личка и канал школы) и юр. документы.
// Фон — тёмно-синий бренда: подвал читается как отдельная плита, а не как
// продолжение кремовой страницы.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer data-app-footer className="mt-28 bg-brand-navy text-brand-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="inline-flex">
            <GelatoLogo className="h-9 sm:h-11" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-brand-cream/70 text-pretty">
            Школа про работу с&nbsp;ИИ: от&nbsp;первого промпта до&nbsp;проекта, который
            проверяет себя сам.
          </p>
        </div>

        <nav aria-label="Разделы" className="space-y-3">
          <p className="font-marker text-base text-brand-sky">Разделы</p>
          <ul className="space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-brand-cream/80 transition-colors hover:text-brand-sky">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <p className="font-marker text-base text-brand-sky">Связаться</p>
          <ul className="space-y-2">
            <li>
              <a
                href={TELEGRAM_DM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-cream/80 transition-colors hover:text-brand-sky"
              >
                <Send className="size-3.5 text-brand-sky" aria-hidden />
                Написать лично
              </a>
            </li>
            <li>
              <a
                href={TELEGRAM_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-cream/80 transition-colors hover:text-brand-sky"
              >
                <Send className="size-3.5 text-brand-sky" aria-hidden />
                Канал школы
              </a>
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-brand-cream/60">
            Отвечаем сами, без рассылок и&nbsp;автоответчиков.
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-marker text-base text-brand-sky">Документы</p>
          <ul className="space-y-2">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-brand-cream/80 transition-colors hover:text-brand-sky">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-cream/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-brand-cream/55 sm:px-6">
          <span>© {year} GELATO</span>
          <span>Обучение работе с&nbsp;ИИ и&nbsp;Claude Code</span>
        </div>
      </div>
    </footer>
  );
}
