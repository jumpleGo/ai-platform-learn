'use client';
import { useLiveCount } from '@/lib/use-live-count';

// Индикатор присутствия в шапке: «N учатся сейчас». Держим честный масштаб —
// 1-3 человека; ноль не показываем, число регистраций задаёт только верхнюю границу.
export function PresenceBar({ registered }: { registered: number }) {
  const hi = Math.min(3, Math.max(1, Math.ceil(registered * 0.1)));
  const n = useLiveCount(Math.min(2, hi), 1, hi);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 font-mono text-xs text-muted-foreground"
      title="Сейчас на платформе"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green/70" />
        <span className="relative inline-flex size-2 rounded-full bg-brand-green" />
      </span>
      <span className="tabular-nums text-foreground/80">{n ?? '·'}</span>
      <span className="hidden sm:inline">
        {n === 1 ? 'учится' : 'учатся'}&nbsp;сейчас
      </span>
    </span>
  );
}
