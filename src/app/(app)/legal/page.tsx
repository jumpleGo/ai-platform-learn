import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, FileText, Send } from 'lucide-react';
import { LEGAL_UPDATED } from '@/lib/legal';
import { LEGAL_NAV, TELEGRAM_DM } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Документы — GELATO',
  description: 'Публичная оферта и политика конфиденциальности школы GELATO.',
  alternates: { canonical: '/legal' },
  robots: { index: false, follow: true },
};

const NOTES: Record<string, string> = {
  '/legal/offer': 'На каких условиях мы оказываем услуги: оплата, доступ, возврат, права на материалы.',
  '/legal/privacy': 'Какие данные собираем, зачем они нужны, кому передаются и как их удалить.',
};

export default function LegalIndexPage() {
  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-8 pt-4 sm:pt-8">
      <header className="space-y-4">
        <p className="font-mono text-sm text-primary">$ документы</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Юридические документы
        </h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          Редакция от&nbsp;{LEGAL_UPDATED}. Реквизиты и&nbsp;закрывающие документы присылаем
          по&nbsp;запросу.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {LEGAL_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm motion-reduce:hover:translate-y-0 sm:p-6"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                <FileText className="size-4.5" aria-hidden />
              </span>
              <span className="flex items-start gap-1 font-heading text-lg font-semibold tracking-tight">
                {item.label}
                <ArrowUpRight
                  className="mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {NOTES[item.href]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <a
        href={TELEGRAM_DM}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Send className="size-3.5" aria-hidden />
        Запросить реквизиты
      </a>
    </div>
  );
}
