'use client';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { usePaymentModal } from '@/components/payment/payment-modal-context';

export function SubscribeButton({
  place,
  tariffId,
  courseSlug,
  courseTitle,
  label = 'Оформить подписку',
  className,
}: {
  place: string;
  tariffId?: string;
  courseSlug?: string;
  courseTitle?: string;
  label?: string;
  className?: string;
}) {
  const { openPaymentModal } = usePaymentModal();

  const handleClick = () => {
    track(EVENTS.subscribeClicked, { place, courseSlug, courseTitle });
    openPaymentModal({ defaultTariffId: tariffId, courseSlug, courseTitle });
  };

  return (
    <Button
      onClick={handleClick}
      className={className || "h-11 rounded-xl px-6 text-[15px] shadow-sm transition-all hover:shadow-md cursor-pointer"}
    >
      {label}
    </Button>
  );
}
