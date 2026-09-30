'use client';
import { useEffect } from 'react';

const COUNTER_ID = 110434658;
const GOAL = 'free_tokens_guide';
const FILE_URL = '/files/gelato-free-tokens-guide.pdf';
// Если Метрику режет блокировщик, колбэк цели не придёт — не держим человека дольше
const MAX_WAIT_MS = 1500;

export function GuideRedirect() {
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(FILE_URL);
    };
    const fallback = setTimeout(go, MAX_WAIT_MS);

    // Скрипт счётчика подключается afterInteractive и может появиться позже этого эффекта
    const poll = setInterval(() => {
      if (!window.ym) return;
      clearInterval(poll);
      window.ym(COUNTER_ID, 'reachGoal', GOAL, undefined, go);
    }, 50);

    return () => {
      clearTimeout(fallback);
      clearInterval(poll);
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <p style={{ textWrap: 'pretty' }}>
        Открываем гайд… Если не открылся,{' '}
        <a href={FILE_URL} className="underline">
          нажмите сюда
        </a>
        .
      </p>
    </main>
  );
}
