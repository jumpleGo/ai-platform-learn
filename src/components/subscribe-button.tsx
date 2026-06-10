'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// Кнопка подписки с трекингом клика; place — место размещения для воронки
export function SubscribeButton({ place }: { place: string }) {
  return (
    <Button
      render={<Link href="/#subscribe" />}
      onClick={() => track(EVENTS.subscribeClicked, { place })}
    >
      Оформить подписку
    </Button>
  );
}
