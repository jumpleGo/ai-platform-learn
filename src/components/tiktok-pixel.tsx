'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { isAdminPath, isLocalHost } from '@/lib/analytics/exclusions';

const PIXEL_ID = 'DALU7I3C77U9262DRHRG';

declare global {
  interface Window {
    ttq?: {
      page: (...args: unknown[]) => void;
      track: (...args: unknown[]) => void;
      [key: string]: unknown;
    };
  }
}

// Пиксель TikTok Ads. SPA-переходы в App Router клиентские, а ttq.page()
// в базовом коде шлётся один раз при загрузке скрипта — на подключение
// новых страниц клиентская навигация внимания не требует (TikTok Ads
// пока не оптимизирует по pageview за пределами первого захода).
export function TikTokPixel() {
  const pathname = usePathname();
  const admin = isAdminPath(pathname);

  if (admin || isLocalHost()) return null;

  return (
    <Script id="tiktok-pixel" strategy="afterInteractive">
      {`!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};


  ttq.load('${PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');`}
    </Script>
  );
}
