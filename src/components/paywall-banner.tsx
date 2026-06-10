import { Lock } from 'lucide-react';
import { SubscribeButton } from '@/components/subscribe-button';

// Информационный баннер — просмотр не блокируется (требование продукта)
export function PaywallBanner() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <Lock className="size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Этот урок доступен по подписке</p>
        <p className="text-sm text-muted-foreground">
          Просмотр не ограничен, но мы будем рады, если вы поддержите проект подпиской.
        </p>
      </div>
      <SubscribeButton place="paywall" />
    </div>
  );
}
