'use client';

import { ArrowUpRight } from 'lucide-react';
import { usePaymentModal } from '@/components/payment/payment-modal-context';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

interface CourseBuyButtonProps {
  courseTitle: string;
  courseSlug?: string;
  label?: string;
  className?: string;
  place?: string;
}

export function CourseBuyButton({
  courseTitle,
  courseSlug,
  label = 'Оформить подписку',
  className = '',
  place = 'course_landing',
}: CourseBuyButtonProps) {
  const { openPaymentModal } = usePaymentModal();

  const handleClick = () => {
    track(EVENTS.subscribeClicked, { place, courseTitle, courseSlug });
    openPaymentModal({ courseTitle, courseSlug });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer ${className}`}
    >
      {label}
      <ArrowUpRight className="size-4" aria-hidden />
    </button>
  );
}
