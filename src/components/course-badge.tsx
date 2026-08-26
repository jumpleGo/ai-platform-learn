import { Badge } from '@/components/ui/badge';

// Слово «бесплатно» — главный крючок на главной, поэтому у него отдельное оформление:
// жёлтый стикер с блеском. Остальные теги — плотный зелёный. Шрифт у обоих обычный.
const FREE_RE = /беспл/i;

export function CourseBadge({ text }: { text: string }) {
  if (!FREE_RE.test(text)) {
    return <Badge className="align-middle">{text}</Badge>;
  }

  return (
    <span className="relative inline-block shrink-0 -rotate-2 align-middle select-none">
      <span className="animate-tag-pop relative inline-flex items-center overflow-hidden rounded-lg border-2 sm:rounded-xl border-brand-cream bg-brand-yellow px-2.5 pt-1 pb-0.5 text-sm font-bold leading-none sm:px-3 sm:text-base text-brand-charcoal shadow-[0_8px_18px_-8px_oklch(0.82_0.12_92/0.95)]">
        {text}
        {/* блик, пробегающий по стикеру раз в несколько секунд */}
        <span
          aria-hidden
          className="animate-tag-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
      </span>
    </span>
  );
}
