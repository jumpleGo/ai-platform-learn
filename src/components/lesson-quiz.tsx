'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Lemon } from '@/components/scene/lemon';
import {
  LESSON_QUIZ_QUESTIONS,
  LESSON_QUIZ_TTL_MS,
  pickLessonQuizResult,
  type LessonQuizResult,
} from '@/lib/lesson-quiz';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// v2 не подхватывает одношаговый результат старой версии: после редизайна
// человек должен увидеть новые три вопроса, а не сразу устаревший диагноз.
export const STORAGE_KEY = 'gelato:lesson-quiz:v2';
const OPTION_MARKS = ['A', 'B', 'C'];

export type StoredLessonQuizResult = { id: LessonQuizResult['id']; expiresAt: number };

export function readStoredLessonQuizResult(): StoredLessonQuizResult | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredLessonQuizResult> | null;
    if (!value || typeof value.id !== 'string' || typeof value.expiresAt !== 'number') return null;
    return value as StoredLessonQuizResult;
  } catch {
    return null;
  }
}

export function LessonQuizDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="banner-marine-frame max-h-[calc(100dvh-1.25rem)] max-w-[calc(100%-1.25rem)] overflow-hidden rounded-[1.75rem] p-0 text-brand-charcoal shadow-[0_20px_70px_rgba(16,38,71,0.28)] ring-0 sm:max-w-xl">
        {open && <LessonQuizBody onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function LessonQuizBody({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  function choose(optionIndex: number) {
    if (loading) return;
    const nextAnswers = [...answers, optionIndex];
    if (nextAnswers.length < LESSON_QUIZ_QUESTIONS.length) {
      setAnswers(nextAnswers);
      return;
    }

    const nextResult = pickLessonQuizResult(nextAnswers);
    const nextExpiresAt = Date.now() + LESSON_QUIZ_TTL_MS;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: nextResult.id, expiresAt: nextExpiresAt }));
    } catch {
      // ignore storage issues
    }
    track(EVENTS.quizCompleted, {
      result_slug: `lesson_${String(nextResult.lessonNumber).padStart(2, '0')}`,
      pain: nextResult.id,
      place: 'scene',
      answers: nextAnswers.join(','),
    });
    setLoading(true);
    router.push(nextResult.href);
  }

  if (loading) {
    return (
      <QuizShell>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="relative mb-4 flex size-20 items-center justify-center">
            <Lemon className="animate-bounce h-auto w-16 -rotate-6" />
          </div>
          <p className="font-marker text-2xl font-bold text-brand-red">Нашли подходящий урок</p>
          <DialogTitle className="mt-2 font-heading text-2xl leading-tight font-extrabold text-brand-navy sm:text-3xl">
            Секунду, открываем урок...
          </DialogTitle>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed font-semibold text-brand-charcoal/80">
            Переносим вас к персональной подборке
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-extrabold text-brand-navy/60">
            <Loader2 className="size-4 animate-spin text-brand-navy" />
            <span>Загружаем материалы...</span>
          </div>
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
