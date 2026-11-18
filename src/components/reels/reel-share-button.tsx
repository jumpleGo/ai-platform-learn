'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';

type ReelShareButtonProps = {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
  variant?: 'default' | 'overlay';
  onClick?: () => void;
};

export function ReelShareButton({ url, title, text, className, variant = 'default', onClick }: ReelShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleShare = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
    // reel_share records the click, including a cancelled native share menu (#600).
    onClick?.();
    const shareUrl = typeof window !== 'undefined'
      ? new URL(url || window.location.href, window.location.href).href
      : url || '';
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
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), 2500);
      } catch {
        setError(true);
      }
    } else {
      setError(true);
    }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      aria-busy={busy}
      className={
        className ?? (variant === 'overlay'
          ? 'group flex flex-col items-center gap-1 text-white focus-visible:outline-2'
          : 'inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')
      }
      aria-label="Поделиться"
    >
      {variant === 'overlay' && (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-90 group-hover:bg-black/60">
          <Share2 className="h-6 w-6 text-white" />
        </span>
      )}
      <span
        aria-live="polite"
        className={variant === 'overlay' ? 'max-w-20 text-center text-[11px] font-medium tracking-tight drop-shadow' : undefined}
      >
        {error ? 'Не удалось поделиться' : copied ? 'Ссылка скопирована' : 'Поделиться'}
      </span>
    </button>
  );
}
