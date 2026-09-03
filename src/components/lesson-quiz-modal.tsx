'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, Copy, Send, X } from 'lucide-react';
import { Lemon } from '@/components/scene/lemon';
import {
  getLessonQuizResult,
  LESSON_QUIZ_RESULTS,
  LESSON_QUIZ_TTL_MS,
  type LessonQuizResult,
} from '@/lib/lesson-quiz';
import { readStoredLessonQuizResult } from '@/components/lesson-quiz';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { SITE_URL } from '@/lib/site';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function LessonQuizMatchModal({
  lessonNumber,
  source,
  utmContent,
}: {
  lessonNumber: number;
  source?: string;
  utmContent?: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<LessonQuizResult | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const isFromQuiz = source === 'pain_quiz';
    const stored = readStoredLessonQuizResult();
    const isStoredValid = Boolean(stored && stored.expiresAt > Date.now());

    let matchedResult: LessonQuizResult | null = null;
    if (utmContent) {
      matchedResult = getLessonQuizResult(utmContent);
    }
    if (!matchedResult && isStoredValid && stored) {
      const candidate = getLessonQuizResult(stored.id);
      if (candidate && candidate.lessonNumber === lessonNumber) {
        matchedResult = candidate;
      }
    }
    if (!matchedResult && isFromQuiz) {
      matchedResult = LESSON_QUIZ_RESULTS.find((r) => r.lessonNumber === lessonNumber) ?? null;
    }

    if (!matchedResult) return;

    const sessionDismissKey = `gelato:quiz-match-dismissed:${lessonNumber}`;
    const alreadyDismissed = sessionStorage.getItem(sessionDismissKey) === '1';

    if (isFromQuiz || (!alreadyDismissed && isStoredValid)) {
      const exp = isStoredValid && stored ? stored.expiresAt : Date.now() + LESSON_QUIZ_TTL_MS;
      setResult(matchedResult);
      setExpiresAt(exp);
      setOpen(true);
    }
  }, [lessonNumber, source, utmContent]);

  useEffect(() => {
    if (!open || !expiresAt) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [open, expiresAt]);

  const absoluteLessonUrl = useMemo(() => {
    if (!result) return '';
    return `${SITE_URL}${result.href}`;
  }, [result]);

  if (!open || !result || !expiresAt) return null;

  const handleClose = () => {
    sessionStorage.setItem(`gelato:quiz-match-dismissed:${lessonNumber}`, '1');
    setOpen(false);
  };

  const handleTelegramClick = () => {
    track(EVENTS.telegramClicked, {
      lesson_id: String(result.lessonNumber).padStart(2, '0'),
      cta_position: 'quiz_match_popup_telegram',
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteLessonUrl || window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Скопируйте ссылку на урок', absoluteLessonUrl || window.location.href);
    }
  };

  const telegramText = `Обязательно посмотреть позже 👇\n${result.lessonTitle}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(absoluteLessonUrl || window.location.href)}&text=${encodeURIComponent(telegramText)}`;

  return (
    <aside
      aria-label="Подборка урока"
      className="fixed bottom-3 inset-x-3 z-50 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem] sm:max-w-md animate-rise"
    >
      <div className="banner-marine-frame relative overflow-hidden rounded-[1.35rem] border-2 border-brand-navy/30 bg-brand-cream/95 p-4 sm:p-5 text-brand-charcoal shadow-[0_16px_50px_rgba(16,38,71,0.25)] backdrop-blur-sm">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 flex size-7 items-center justify-center rounded-full text-brand-navy/60 transition-colors hover:bg-brand-navy/10 hover:text-brand-navy"
          aria-label="Закрыть уведомление"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2 pr-7">
          <Lemon className="size-5 -rotate-6 shrink-0" />
          <p className="font-marker text-lg leading-none font-bold text-brand-red">Подобрали под вашу задачу</p>
        </div>

        <p className="mt-2 text-[14px] leading-snug font-extrabold text-brand-navy">
          {result.verdict}
        </p>
        <p className="mt-1 text-xs leading-relaxed font-semibold text-brand-charcoal/80">
          {result.explanation}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-brand-navy/15 bg-brand-yellow/45 px-3 py-2 text-xs font-bold text-brand-navy">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-brand-navy/80">
            <Clock3 className="size-3.5 shrink-0" />
            Ссылка сохранена ещё на
          </span>
          <span className="font-mono text-xs font-extrabold tabular-nums text-brand-navy" aria-live="polite">
            {formatRemaining(expiresAt - now)}
          </span>
        </div>

        <div className="mt-3.5 flex flex-col gap-2">
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTelegramClick}
            className="btn-goose inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-4 text-[13.5px] font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-transform hover:-translate-y-0.5"
          >
            <Send className="size-3.5" />
            Сохранить в Telegram
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-brand-navy/70 transition-colors hover:bg-brand-navy/5 hover:text-brand-navy"
          >
            <Copy className="size-3" />
            {copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </button>
        </div>
      </div>
    </aside>
  );
}
