'use client';
import { useLiveCount } from '@/lib/use-live-count';

// Индикатор присутствия в шапке: «N учатся сейчас». База — доля от числа
// зарегистрированных, с дружелюбным минимумом, чтобы платформа не выглядела пустой.
export function PresenceBar({ registered }: { registered: number }) {
  const base = Math.max(4, Math.round(registered * 0.12));
  const n = useLiveCount(base);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 font-mono text-xs text-muted-foreground"
      title="Сейчас на платформе"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="tabular-nums text-foreground/80">{n ?? '·'}</span>
      <span className="hidden sm:inline">учатся&nbsp;сейчас</span>
    </span>
  );
}
