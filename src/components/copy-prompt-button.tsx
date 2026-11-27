'use client';

import { useState } from 'react';

export function CopyPromptButton({ text }: { text: string }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');

  async function copy() {
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className="mt-3">
      <input
        type="button"
        value="Скопировать запрос"
        className="min-h-11 max-w-full cursor-pointer rounded-xl border border-brand-navy/30 bg-card px-3 text-sm font-semibold text-brand-navy hover:bg-brand-yellow/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-wait disabled:opacity-60"
        disabled={status === 'copying'}
        onClick={copy}
      />
      <p role="status" className="text-sm leading-snug text-foreground not-empty:mt-2">
        {status === 'copied' && 'Запрос скопирован.'}
        {status === 'failed' && 'Не удалось скопировать запрос. Выделите текст запроса и скопируйте его вручную.'}
      </p>
    </div>
  );
}
