'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';

// Инициализирует posthog-синглтон на клиенте; без ключа — no-op
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2025-05-24',
    });
  }, []);

  return <>{children}</>;
}
