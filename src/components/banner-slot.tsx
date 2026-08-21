'use client';
import { useEffect, useRef } from 'react';
import type { BannerSlot } from '@/lib/banners';

const ENDPOINT = '/api/banner-stats';

type Event =
  | { type: 'shown' }
  | { type: 'click'; href: string; label: string };

// Маркетинговый блок урока: рендерит готовый HTML варианта и считает показ и клики.
// HTML пишет владелец сайта в админке — доверенный контент, не пользовательский ввод.
export function BannerSlotView({ courseId, lessonId, slot, variantId, html, preview = false }: {
  courseId: string;
  lessonId: string;
  slot: BannerSlot;
  variantId: string;
  html: string;
  // Вариант открыт вручную через ?banner= — смотрим, как выглядит, статистику не трогаем
  preview?: boolean;
}) {
  const shown = useRef(false);

  function send(event: Event) {
    if (preview) return;
    const body = JSON.stringify({ courseId, lessonId, slot, variantId, ...event });
    // sendBeacon доживает до конца навигации — клик по ссылке в том же окне не теряется
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    void fetch(ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    }).catch(() => {});
  }

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    send({ type: 'shown' });
    // показ считаем один раз на монтирование варианта
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId, slot, variantId]);

  // клики ловим делегированием: внутри баннера произвольный HTML, вешать слушатели не на что
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    // data-cta — необязательное имя кнопки для статистики, иначе берём текст ссылки
    const label = (link.dataset.cta ?? link.textContent ?? '').replace(/\s+/g, ' ').trim();
    send({ type: 'click', href: link.href, label });
  }

  return (
    <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
