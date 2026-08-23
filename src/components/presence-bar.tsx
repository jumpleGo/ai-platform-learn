'use client';
import { useLiveCount } from '@/lib/use-live-count';

// Индикатор присутствия в шапке: «N учатся сейчас». Держим честный масштаб —
// 1-3 человека, иногда ноль; число регистраций задаёт только верхнюю границу.
export function PresenceBar({ registered }: { registered: number }) {
  const hi = Math.min(3, Math.max(1, Math.ceil(registered * 0.1)));
  const n = useLiveCount(Math.min(2, hi), 0, hi);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 font-mono text-xs text-muted-foreground"
      title="Сейчас на платформе"
    >
      <span className="relative flex size-2">
        {n !== 0 && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
        )}
        <span className={`relative inline-flex size-2 rounded-full ${n === 0 ? 'bg-muted-foreground/50' : 'bg-emerald-500'}`} />
      </span>
      <span className="tabular-nums text-foreground/80">{n ?? '·'}</span>
      <span className="hidden sm:inline">
        {n === 1 ? 'учится' : 'учатся'}&nbsp;сейчас
      </span>
    </span>
  );
}
