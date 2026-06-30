import { Lock } from 'lucide-react';
import { SubscribeButton } from '@/components/subscribe-button';

// Баннер для заблокированного урока — видео и материалы доступны только по подписке
export function PaywallBanner() {
  return (
    <div className="animate-rise flex flex-wrap items-center gap-4 rounded-2xl border border-accent-foreground/15 bg-accent p-5 sm:p-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Lock className="size-4 text-primary" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Этот урок доступен по подписке</p>
        <p className="text-sm text-muted-foreground">
          Оформите подписку, чтобы открыть видео и&nbsp;материалы урока.
        </p>
      </div>
      <SubscribeButton place="paywall" />
    </div>
  );
}
