import { Fragment } from 'react';
import { parseBlocks, parseInline, type Inline } from '@/lib/markdown';

// Безопасные ссылки: только http(s), остальное гасим (без javascript: и пр.)
function safeHref(href: string): string | null {
  try {
    const u = new URL(href, 'https://x');
    return u.protocol === 'http:' || u.protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
}

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-baseline">
      {keys.map((k, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="px-0.5 text-xs text-muted-foreground">+</span>}
          <kbd className="inline-flex min-w-5 items-center justify-center rounded-md border border-border border-b-2 bg-muted px-1.5 py-0.5 font-mono text-[0.75em] font-medium text-foreground shadow-sm">
            {k}
          </kbd>
        </Fragment>
      ))}
    </span>
  );
}

function Inlines({ tokens }: { tokens: Inline[] }) {
  return (
    <>
      {tokens.map((tok, i) => {
        switch (tok.t) {
          case 'text':
            return <Fragment key={i}>{tok.v}</Fragment>;
          case 'bold':
            return <strong key={i} className="font-semibold text-foreground">{tok.v}</strong>;
          case 'italic':
            return <em key={i}>{tok.v}</em>;
          case 'code':
            return (
              <code key={i} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
                {tok.v}
              </code>
            );
          case 'kbd':
            return <Kbd key={i} keys={tok.keys} />;
          case 'link': {
            const href = safeHref(tok.href);
            if (!href) return <Fragment key={i}>{tok.label}</Fragment>;
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
              >
                {tok.label}
              </a>
            );
          }
        }
      })}
    </>
  );
}

// Рендер markdown-материалов урока
// Строка контента с простой разметкой внутри: **жирный**, *курсив*, `код`,
// ссылки. Нужна там, где текст из lib рендерится как обычный текст абзаца —
// сам по себе он разметку не разбирает.
export function RichText({ text }: { text: string }) {
  return <Inlines tokens={parseInline(text)} />;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'heading': {
            const cls =
              b.level === 2
                ? 'mt-7 mb-2.5 font-heading text-xl font-bold tracking-tight text-balance first:mt-0'
                : 'mt-5 mb-2 font-heading text-base font-bold tracking-tight first:mt-0';
            return b.level === 2
              ? <h2 key={i} className={cls}><Inlines tokens={parseInline(b.text)} /></h2>
              : <h3 key={i} className={cls}><Inlines tokens={parseInline(b.text)} /></h3>;
          }
          case 'p':
            return (
              <p key={i} className="mt-3 leading-relaxed text-pretty text-muted-foreground first:mt-0">
                <Inlines tokens={parseInline(b.text)} />
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="mt-3 space-y-1.5 first:mt-0">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 leading-relaxed text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                    <span><Inlines tokens={parseInline(it)} /></span>
                  </li>
                ))}
              </ul>
            );
          case 'ol': {
            const start = b.start ?? 1;
            return (
              <ol key={i} className="mt-3 space-y-2 first:mt-0" start={start}>
                {b.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2.5 leading-relaxed text-muted-foreground">
                    <span className="font-marker text-2xl leading-none text-primary shrink-0 select-none">
                      {start + j}.
                    </span>
                    <span className="min-w-0 pt-0.5"><Inlines tokens={parseInline(it)} /></span>
                  </li>
                ))}
              </ol>
            );
          }
          case 'callout':
            return (
              <div key={i} className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 first:mt-0">
                <p className="leading-relaxed text-pretty text-foreground/90">
                  <Inlines tokens={parseInline(b.text)} />
                </p>
              </div>
            );
          case 'code':
            return (
              <pre key={i} className="mt-4 overflow-x-auto rounded-xl border border-border bg-secondary p-4 font-mono text-sm first:mt-0">
                <code>{b.text}</code>
              </pre>
            );
          case 'table':
            return (
              <div key={i} className="mt-4 overflow-x-auto first:mt-0">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {b.headers.map((h, j) => (
                        <th key={j} className="border-b border-border px-3 py-2 text-left font-semibold text-foreground">
                          <Inlines tokens={parseInline(h)} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j} className="border-b border-border/50 last:border-0">
                        {row.map((cell, k) => (
                          <td key={k} className="px-3 py-2 text-muted-foreground">
                            <Inlines tokens={parseInline(cell)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
