import { Lock } from 'lucide-react';

export function LockBadge() {
  return (
    <span className="absolute right-2 top-8 rounded-md border border-border/60 bg-background/85 p-1.5 shadow-sm backdrop-blur-sm">
      <Lock className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="sr-only">Доступно по подписке</span>
    </span>
  );
}
