import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '@/lib/faq-content';

// Аккордеон на нативных details/summary: работает без JS и не тянет клиентский бандл.
export function FaqAccordion({ items, startOpen = false }: { items: readonly FaqItem[]; startOpen?: boolean }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/50">
      {items.map((item, i) => (
        <li key={item.question}>
          <details open={startOpen && i === 0} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-[15px] leading-snug font-bold text-balance marker:content-none transition-colors hover:text-primary sm:px-6">
              {item.question}
              <ChevronDown
                className="mt-0.5 size-5 shrink-0 text-primary transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground text-pretty sm:px-6 whitespace-pre-line">
              {item.answer}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
