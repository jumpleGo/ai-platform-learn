import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Общая шапка секции: надстрочная метка, заголовок, пояснение и ссылка вбок.
// Один ритм на всех публичных страницах.
export function SectionHead({
  eyebrow,
  title,
  note,
  action,
}: {
  eyebrow: string;
  title: string;
  note?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="max-w-2xl space-y-2">
        <p className="font-mono text-sm tracking-wide text-primary">{eyebrow}</p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
        {note && <p className="leading-relaxed text-muted-foreground text-pretty whitespace-pre-line">{note}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
