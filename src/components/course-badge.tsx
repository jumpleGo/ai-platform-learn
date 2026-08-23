import { DoodleScatter } from '@/components/doodle-decor';
import { Badge } from '@/components/ui/badge';

// Слово «бесплатно» — главный крючок на главной, поэтому у него отдельное оформление:
// жёлтый маркерный стикер с блеском. Остальные теги остаются спокойным терракотом.
const FREE_RE = /беспл/i;

export function CourseBadge({ text }: { text: string }) {
  if (!FREE_RE.test(text)) return <Badge variant="default" className="align-middle">{text}</Badge>;

  return (
    <span className="relative inline-block shrink-0 -rotate-2 align-middle select-none">
      <span className="animate-tag-pop relative inline-flex items-center overflow-hidden rounded-lg border-2 sm:rounded-xl border-white bg-[oklch(0.87_0.17_92)] px-2.5 pt-1.5 pb-1 font-marker text-sm leading-none sm:px-3 sm:pt-1.5 sm:pb-1 sm:text-base text-[oklch(0.27_0.012_60)] shadow-[0_8px_18px_-8px_oklch(0.72_0.16_85/0.95)] dark:border-white/75">
        {text}
        {/* блик, пробегающий по стикеру раз в несколько секунд */}
        <span
          aria-hidden
          className="animate-tag-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
      </span>
      <DoodleScatter
        glyph="starburst"
        color="oklch(0.68 0.19 12)"
        className="-top-2 -right-2 h-4 w-4 rotate-12 sm:-top-2.5 sm:-right-2.5 sm:h-5 sm:w-5"
      />
    </span>
  );
}
