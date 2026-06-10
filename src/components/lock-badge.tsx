import { Lock } from 'lucide-react';

export function LockBadge() {
  return (
    <span className="absolute right-2 top-2 rounded-md bg-background/80 p-1.5">
      <Lock className="size-3.5" aria-hidden />
      <span className="sr-only">Доступно по подписке</span>
    </span>
  );
}
