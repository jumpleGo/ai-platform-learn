'use client';
import { useLiveCount } from '@/lib/use-live-count';
import { plural } from '@/lib/utils';

// «N смотрят сейчас» под видео. База зависит от популярности урока (число просмотров).
export function WatchingNow({ seed }: { seed: number }) {
  const base = Math.max(1, Math.round(3 + seed / 50));
  const n = useLiveCount(base);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="tabular-nums text-foreground/80">
        {n === null ? '·' : `${n} ${plural(n, ['смотрит', 'смотрят', 'смотрят'])}`} сейчас
      </span>
    </span>
  );
}
