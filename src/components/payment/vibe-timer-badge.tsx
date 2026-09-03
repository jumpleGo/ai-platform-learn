'use client';

import { useVibePriceTimer } from '@/lib/payments/vibe-timer-client';

export function VibeTimerBadge({ className = '' }: { className?: string }) {
  const { mounted, isExpired, formattedTime } = useVibePriceTimer();

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/90 px-3.5 py-1.5 shadow-[0_2px_0_0_rgba(16,38,71,0.06)] ${className}`}>
        <span className="size-2 rounded-full bg-brand-forest animate-pulse" aria-hidden />
        <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-navy">Спеццена 24 часа</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-2xl border-2 border-brand-navy/10 bg-card/60 px-3.5 py-1.5 ${className}`}>
        <span className="font-mono text-xs font-bold text-brand-charcoal/60">Срок действия спеццены истёк</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl border-2 border-brand-navy/20 bg-brand-cream px-3.5 py-1.5 shadow-[0_2px_0_0_rgba(16,38,71,0.08)] ${className}`}>
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-brand-red" />
      </span>
      <span className="font-heading text-xs font-black text-brand-navy">
        Спеццена сгорит через{' '}
        <span className="font-mono text-xs font-black text-brand-red bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded-md ml-0.5">
          {formattedTime}
        </span>
      </span>
    </div>
  );
}

