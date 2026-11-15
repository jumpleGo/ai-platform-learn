import Link from 'next/link';
import { Fragment } from 'react';
import { LEGAL_UPDATED, legalRequisites } from '@/lib/legal';
import { SITE_URL, TELEGRAM_DM } from '@/lib/site';

export type LegalSection = {
  title: string;
  // Абзацы и списки идут в порядке объявления: строка — абзац, массив — список
  body: readonly (string | readonly string[])[];
};

// Подстановки в тексте документов: адреса живут в одном месте (lib/site), а сам
// абзац остаётся обычной строкой — поэтому его можно править как текст.
const TOKENS: Record<string, string> = { '{site}': SITE_URL, '{dm}': TELEGRAM_DM };

function withTokens(text: string) {
  return text
    .split(/(\{site\}|\{dm\})/g)
    .filter(Boolean)
    .map((part, i) =>
      TOKENS[part] ? (
        // подстановка, а не текст: правится в lib/site, со страницы не редактируется
        <span key={i} data-no-text-edit>
          {TOKENS[part]}
        </span>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}

// Общий каркас юр. документа: узкая колонка, нумерованные разделы, реквизиты в конце.
export function LegalDoc({
  title,
  lead,
  sections,
  other,
}: {
  title: string;
  lead: string;
  sections: readonly LegalSection[];
  // Ссылка на парный документ — из подвала одного удобно перейти в другой
  other: { href: string; label: string };
}) {
  const requisites = legalRequisites();
  return (
    <article className="animate-rise mx-auto max-w-3xl space-y-10 pt-4 sm:pt-8">
      <header className="space-y-4">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">{lead}</p>
        <p className="font-mono text-xs text-muted-foreground">Редакция от&nbsp;{LEGAL_UPDATED}</p>
      </header>

      <div className="space-y-9">
        {sections.map((section, i) => (
          <section key={section.title} className="space-y-3">
            <h2 className="font-heading text-lg font-bold tracking-tight text-balance">
              <span className="mr-2 font-mono text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
              {section.title}
            </h2>
            {section.body.map((block, j) =>
              typeof block === 'string' ? (
                <p key={j} className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
                  {withTokens(block)}
                </p>
              ) : (
                <ul key={j} className="space-y-1.5 pl-1">
                  {block.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[15px] leading-relaxed text-muted-foreground text-pretty"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                      {withTokens(item)}
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>

      <footer className="rounded-2xl border border-border bg-secondary/50 p-5 sm:p-6">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Реквизиты</p>
        {requisites.length > 0 ? (
          <dl className="mt-3 space-y-2">
            {requisites.map((field) => (
              <div key={field.label} className="flex flex-wrap gap-x-2 text-sm">
                <dt className="text-muted-foreground">{field.label}:</dt>
                <dd className="font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            Полные реквизиты и&nbsp;закрывающие документы присылаем по&nbsp;запросу —{' '}
            <a
              href={TELEGRAM_DM}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
            >
              напишите в&nbsp;телеграм
            </a>
            .
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Второй документ:{' '}
          <Link href={other.href} className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
            {other.label}
          </Link>
        </p>
      </footer>
    </article>
  );
}
