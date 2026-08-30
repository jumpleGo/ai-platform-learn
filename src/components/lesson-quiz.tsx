'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Clock3, Copy, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Lemon } from '@/components/scene/lemon';
import {
  getLessonQuizResult,
  LESSON_QUIZ_QUESTIONS,
  LESSON_QUIZ_TTL_MS,
  pickLessonQuizResult,
  type LessonQuizResult,
} from '@/lib/lesson-quiz';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { SITE_URL } from '@/lib/site';

// v2 не подхватывает одношаговый результат старой версии: после редизайна
// человек должен увидеть новые три вопроса, а не сразу устаревший диагноз.
const STORAGE_KEY = 'gelato:lesson-quiz:v2';
const OPTION_MARKS = ['A', 'B', 'C'];

type StoredResult = { id: LessonQuizResult['id']; expiresAt: number };

function readStoredResult(): StoredResult | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<StoredResult> | null;
    if (!value || typeof value.id !== 'string' || typeof value.expiresAt !== 'number') return null;
    if (!getLessonQuizResult(value.id)) return null;
    return value as StoredResult;
  } catch {
    return null;
  }
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function LessonQuizDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="banner-marine-frame max-h-[calc(100dvh-1.25rem)] max-w-[calc(100%-1.25rem)] overflow-hidden rounded-[1.75rem] p-0 text-brand-charcoal shadow-[0_20px_70px_rgba(16,38,71,0.28)] ring-0 sm:max-w-xl">
        <LessonQuizBody onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function LessonQuizBody({ onDone }: { onDone: () => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<LessonQuizResult | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = readStoredResult();
    if (!stored) return;
    if (stored.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setResult(getLessonQuizResult(stored.id));
    setExpiresAt(stored.expiresAt);
  }, []);

  useEffect(() => {
    if (!result || !expiresAt) return;
    const tick = () => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        setExpired(true);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [result, expiresAt]);

  const absoluteLessonUrl = useMemo(
    () => (result ? `${SITE_URL}${result.href}` : ''),
    [result],
  );

  function choose(optionIndex: number) {
    const nextAnswers = [...answers, optionIndex];
    if (nextAnswers.length < LESSON_QUIZ_QUESTIONS.length) {
      setAnswers(nextAnswers);
      return;
    }

    const nextResult = pickLessonQuizResult(nextAnswers);
    const nextExpiresAt = Date.now() + LESSON_QUIZ_TTL_MS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: nextResult.id, expiresAt: nextExpiresAt }));
    setAnswers(nextAnswers);
    setResult(nextResult);
    setExpiresAt(nextExpiresAt);
    setNow(Date.now());
    setExpired(false);
    track(EVENTS.quizCompleted, {
      result_slug: `lesson_${String(nextResult.lessonNumber).padStart(2, '0')}`,
      pain: nextResult.id,
      place: 'scene',
      answers: nextAnswers.join(','),
    });
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY);
    setAnswers([]);
    setResult(null);
    setExpiresAt(null);
    setExpired(false);
    setCopied(false);
  }

  async function copyLessonLink() {
    try {
      await navigator.clipboard.writeText(absoluteLessonUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Скопируйте ссылку на урок', absoluteLessonUrl);
    }
  }

  if (result && expiresAt && expired) {
    return (
      <QuizShell>
        <div className="space-y-5 text-center">
          <Lemon className="mx-auto h-auto w-20 -rotate-6" />
          <div className="space-y-2">
            <p className="font-marker text-2xl font-bold text-brand-red">Подборка устарела</p>
            <DialogTitle className="font-heading text-2xl leading-tight font-extrabold text-brand-navy">
              Время персональной подборки вышло
            </DialogTitle>
            <p className="mx-auto max-w-sm text-[15px] leading-relaxed font-semibold text-brand-charcoal/85">
              Ответьте ещё раз — разберёмся, что мешает вам сейчас.
            </p>
          </div>
          <button type="button" onClick={restart} className="btn-goose h-12 w-full rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold text-brand-navy shadow-[0_4px_0_0_var(--color-goose-red)] transition-transform hover:-translate-y-0.5">
            Собрать заново
          </button>
        </div>
      </QuizShell>
    );
  }

  if (result && expiresAt) {
    const telegramText = `Обязательно посмотреть позже 👇\n${result.lessonTitle}`;
    const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(absoluteLessonUrl)}&text=${encodeURIComponent(telegramText)}`;
    return (
      <QuizShell>
        <div className="relative">
          <Lemon className="pointer-events-none absolute -top-10 -right-8 h-auto w-24 rotate-12 opacity-95 sm:-right-3" />
          <div className="max-w-[82%] space-y-1">
            <p className="font-marker text-2xl leading-none font-bold text-brand-red">Вот что вам поможет</p>
            <DialogTitle className="font-heading text-[1.65rem] leading-[1.06] font-extrabold tracking-[-0.02em] text-brand-navy sm:text-3xl">
              {result.verdict}
            </DialogTitle>
          </div>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed font-semibold text-brand-charcoal/85">{result.explanation}</p>
        </div>

        <div className="mt-5 -rotate-[0.4deg] rounded-2xl border-2 border-brand-navy bg-brand-yellow/55 p-4 shadow-[3px_4px_0_0_var(--color-brand-navy)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-brand-cream">
              <Check className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-marker text-xl leading-none font-bold text-brand-red">Подходящий урок</p>
              <p className="mt-1 text-[15px] leading-snug font-extrabold text-brand-navy">{result.lessonTitle}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-brand-navy/15 pt-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-navy/80">
              <Clock3 className="size-3.5" aria-hidden />
              Ссылка сохранена ещё на
            </span>
            <span className="font-mono text-sm font-extrabold tabular-nums text-brand-navy" aria-live="polite">
              {formatRemaining(expiresAt - now)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Link
            href={result.href}
            onClick={() => {
              track(EVENTS.lessonCtaClicked, {
                lesson_id: String(result.lessonNumber).padStart(2, '0'),
                cta_position: 'pain_quiz_result',
                destination: result.href,
              });
              onDone();
            }}
            className="btn-goose inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold text-brand-navy shadow-[0_4px_0_0_var(--color-goose-red)] transition-transform hover:-translate-y-0.5"
          >
            Забрать мой урок
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(EVENTS.telegramClicked, {
                lesson_id: String(result.lessonNumber).padStart(2, '0'),
                cta_position: 'pain_quiz_save',
              })}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy/20 bg-brand-cream/70 text-sm font-bold text-brand-navy transition-colors hover:border-brand-navy/50"
            >
              <Send className="size-3.5" aria-hidden />
              Сохранить в Telegram
            </a>
            <button type="button" onClick={copyLessonLink} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy/20 bg-brand-cream/70 text-sm font-bold text-brand-navy transition-colors hover:border-brand-navy/50">
              <Copy className="size-3.5" aria-hidden />
              {copied ? 'Скопировано' : 'Скопировать'}
            </button>
          </div>
          <button type="button" onClick={restart} className="mt-1 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold text-brand-navy/75 transition-colors hover:text-brand-navy">
            <ArrowLeft className="size-3.5" aria-hidden />
            Пройти ещё раз
          </button>
        </div>
      </QuizShell>
    );
  }

  const step = answers.length;
  const question = LESSON_QUIZ_QUESTIONS[step];

  return (
    <QuizShell>
      <div className="mb-5 flex items-center justify-between gap-5 pr-8">
        <div>
          <p className="font-marker text-2xl leading-none font-bold text-brand-red">Найдём, что мешает</p>
          <p className="mt-1 text-[13px] font-extrabold tracking-wide text-brand-navy/75 uppercase">3 вопроса · меньше минуты</p>
        </div>
        <div className="flex gap-1.5" aria-label={`Вопрос ${step + 1} из ${LESSON_QUIZ_QUESTIONS.length}`}>
          {LESSON_QUIZ_QUESTIONS.map((item, index) => (
            <span
              key={item.id}
              className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-extrabold transition-colors ${
                index < step
                  ? 'border-brand-navy bg-brand-navy text-brand-cream'
                  : index === step
                    ? 'border-brand-navy bg-brand-yellow text-brand-navy'
                    : 'border-brand-navy/20 bg-brand-cream/60 text-brand-navy/35'
              }`}
              aria-hidden
            >
              {index < step ? '✓' : index + 1}
            </span>
          ))}
        </div>
      </div>

      <div key={question.id} className="animate-rise">
        <p className="mb-1.5 text-[13px] font-extrabold tracking-wide text-brand-forest uppercase">{question.eyebrow}</p>
        <DialogTitle className="max-w-lg font-heading text-[1.45rem] leading-[1.08] font-extrabold tracking-[-0.02em] text-brand-navy sm:text-[1.75rem]">
          {question.question}
        </DialogTitle>

        <ul className="mt-5 space-y-2.5">
          {question.options.map((option, index) => (
            <li key={option.label}>
              <button
                type="button"
                onClick={() => choose(index)}
                className="group flex w-full items-center gap-3 rounded-2xl border-2 border-brand-navy/20 bg-brand-cream/75 px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:rotate-[0.2deg] hover:border-brand-navy hover:bg-brand-yellow/45 hover:shadow-[2px_3px_0_0_var(--color-brand-navy)] motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-navy bg-brand-sky/55 font-marker text-lg leading-none text-brand-navy transition-colors group-hover:bg-brand-yellow">
                  {OPTION_MARKS[index]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] leading-snug font-extrabold text-brand-navy">{option.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {step > 0 && (
        <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-navy/75 transition-colors hover:text-brand-navy">
          <ArrowLeft className="size-3.5" aria-hidden />
          Назад
        </button>
      )}
    </QuizShell>
  );
}

function QuizShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-h-[calc(100dvh-1.6rem)] overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
      <span className="pointer-events-none absolute -bottom-5 -left-5 size-16 rounded-full border-[10px] border-brand-yellow/45 opacity-70" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}
