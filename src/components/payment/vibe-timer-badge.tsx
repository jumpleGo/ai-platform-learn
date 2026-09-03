'use client';

import { useVibePriceTimer } from '@/lib/payments/vibe-timer-client';
import { Clock } from 'lucide-react';

export function VibeTimerBadge({ className = '' }: { className?: string }) {
  const { mounted, isExpired, formattedTime } = useVibePriceTimer();

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border border-brand-red/25 bg-brand-red/10 px-3 py-1 font-mono text-xs font-bold text-brand-red ${className}`}>
        <Clock className="size-3.5" aria-hidden />
        <span>Спеццена 24 часа</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border border-brand-charcoal/20 bg-card/60 px-3 py-1 font-mono text-xs font-bold text-brand-charcoal/60 ${className}`}>
        <span>Срок действия спеццены истёк</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/10 px-3.5 py-1 font-mono text-xs font-bold text-brand-red shadow-xs ${className}`}>
      <span className="size-2 rounded-full bg-brand-red animate-pulse" aria-hidden />
      <Clock className="size-3.5" aria-hidden />
      <span>Спец.цена сгорит через {formattedTime}</span>
    </div>
  );
}
