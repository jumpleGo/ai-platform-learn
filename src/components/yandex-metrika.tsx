'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { isAdminPath, isLocalHost } from '@/lib/analytics/exclusions';

const COUNTER_ID = 110434658;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

// Счётчик Яндекс.Метрики. В App Router переходы между страницами клиентские,
// поэтому первый хит делает сам скрипт, а последующие шлём вручную.
export function YandexMetrika() {
  const pathname = usePathname();
  const admin = isAdminPath(pathname);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (admin || isLocalHost()) return;
    window.ym?.(COUNTER_ID, 'hit', window.location.href);
  }, [pathname, admin]);

  // Админку не считаем совсем: скрипт там не подключается
  if (admin) return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {/* Проверку локалхоста делаем внутри скрипта, а не условным рендером:
            иначе разметка сервера и клиента разойдётся при локальном next start */}
        {`if (!/^(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[?::1\\]?|.*\\.local)$/.test(location.hostname)) {
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

ym(${COUNTER_ID}, "init", {
  clickmap:true,
  trackLinks:true,
  accurateTrackBounce:true,
  webvisor:true
});
}`}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
