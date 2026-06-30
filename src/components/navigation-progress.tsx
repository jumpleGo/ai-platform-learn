'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Тонкая полоса прогресса вверху страницы. Появляется сразу по клику на
// внутреннюю ссылку (или назад/вперёд) и закрывается, когда новый маршрут
// смонтирован — мгновенная реакция, пока рендерится тяжёлая страница.
export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');

  // старт: клик по внутренней ссылке на другой путь либо навигация назад/вперёд
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      // только внутренние переходы на другой pathname (не якоря, не внешние)
      if (!href.startsWith('/') || href.startsWith('/#')) return;
      const url = new URL(href, location.href);
      if (url.pathname === location.pathname) return;
      setPhase('loading');
    }
    const onPopState = () => setPhase('loading');
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // финиш: pathname сменился — страница смонтирована, добиваем до 100% и гасим
  const prev = useRef(pathname);
  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;
    setPhase('done');
    const t = setTimeout(() => setPhase('idle'), 400);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className={cn(
          'h-full origin-left bg-primary shadow-[0_0_10px] shadow-primary/50',
          phase === 'idle' && 'w-0 opacity-0 transition-none',
          // едет к 90% с замедлением и не доходит до конца, пока грузится
          phase === 'loading' &&
            'w-[90%] opacity-100 transition-[width] duration-[10s] ease-out motion-reduce:transition-none',
          phase === 'done' && 'w-full opacity-0 transition-[width,opacity] duration-300 ease-out',
        )}
      />
    </div>
  );
}
