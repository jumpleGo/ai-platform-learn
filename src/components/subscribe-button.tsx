'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// Кнопка подписки с трекингом клика; place — место размещения для воронки
export function SubscribeButton({ place }: { place: string }) {
  return (
    <Button
      // рендерим как ссылку (<a>), поэтому отключаем семантику нативной кнопки
      nativeButton={false}
      render={<Link href="/#subscribe" />}
      className="h-11 rounded-xl px-6 text-[15px] shadow-sm transition-all hover:shadow-md"
      onClick={() => track(EVENTS.subscribeClicked, { place })}
    >
      Оформить подписку
    </Button>
  );
}
