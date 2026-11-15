'use client';

import { useEffect } from 'react';
import posthog from './posthog';
import { isAdminPath, isTrackingDisabled } from './exclusions';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === 'undefined' || isTrackingDisabled()) return;

    // Snapshot attribution before the SDK download or a client-side navigation.
    const referrer = document.referrer;
    let referringDomain = '(none)';
    try {
      if (referrer) referringDomain = new URL(referrer).hostname || '(none)';
    } catch {
      // An unusable referrer must not interrupt analytics initialization.
    }
    const firstTouch = {
      first_touch_utm_source: new URLSearchParams(window.location.search).get('utm_source') || '(none)',
      first_touch_referrer: referrer || '(none)',
      first_touch_referring_domain: referringDomain,
      first_touch_pathname: window.location.pathname,
    };
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const start = () => {
      void posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        before_send: (event) => (isAdminPath() ? null : event),
      }, firstTouch).catch(() => {
        if (!cancelled) timer = setTimeout(start, 1000);
      });
    };
    // A task after the animation frame lets the browser paint before import().
    const frame = window.requestAnimationFrame?.(() => { timer = setTimeout(start, 0); });
    if (frame === undefined) timer = setTimeout(start, 0);
    return () => {
      cancelled = true;
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  return <>{children}</>;
}
