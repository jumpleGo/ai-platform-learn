'use client';

import React, { useState } from 'react';

type ReelShareButtonProps = {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
};

export function ReelShareButton({ url, title, text, className }: ReelShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Fallback if clipboard API is unavailable or denied
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ??
        'inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      }
      aria-label="Поделиться"
    >
      {copied ? 'Ссылка скопирована' : 'Поделиться'}
    </button>
  );
}
