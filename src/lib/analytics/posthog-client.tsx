'use client';
import posthog from 'posthog-js';
import { isAdminPath, isTrackingDisabled } from './exclusions';

// Инициализация одна на вкладку; флаг переживает повторный рендер в StrictMode
let started = false;

// Инициализирует posthog-синглтон на клиенте; без ключа — no-op.
// Инициализируем в теле компонента, а не в эффекте: эффекты детей выполняются
// раньше родительских, и события «при монтировании» (просмотр варианта главной,
// просмотр урока) иначе терялись бы на первой загрузке страницы.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (typeof window !== 'undefined' && key && !started && !isTrackingDisabled()) {
    started = true;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2025-05-24',
      // Переход в админку уже после инициализации: события оттуда отсекаем на лету
      before_send: (event) => (isAdminPath() ? null : event),
    });
    const referrer = document.referrer;
    let referringDomain = '(none)';
    try {
      if (referrer) referringDomain = new URL(referrer).hostname || '(none)';
    } catch {
      // An unusable referrer must not interrupt analytics initialization.
    }
    posthog.register_once({
      first_touch_utm_source: new URLSearchParams(window.location.search).get('utm_source') || '(none)',
      first_touch_referrer: referrer || '(none)',
      first_touch_referring_domain: referringDomain,
      first_touch_pathname: window.location.pathname,
    });
  }

  return <>{children}</>;
}
