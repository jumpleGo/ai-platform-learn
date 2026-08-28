'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Send, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DoodleWord } from '@/components/doodle-decor';
import { QUIZ, pickQuizResult, type QuizResult } from '@/lib/quiz';
import { TELEGRAM_DM } from '@/lib/site';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// Баннер-тест с витрины обучений: «пройди тест и узнай, что подойдёт именно тебе».
// По эскизу тест открывается поверх той же страницы, никуда не уводя.
export function CourseQuizBanner() {
  const [open, setOpen] = useState(false);

  function start() {
    track(EVENTS.quizStarted, { place: 'courses' });
    setOpen(true);
  }

  return (
    <section className="animate-rise relative">
      <DoodleWord
        text="30 секунд"
        color="oklch(0.535 0.1893 28.3)"
        className="z-10 -top-4 left-5 text-xl -rotate-6 sm:-top-5 sm:left-9 sm:text-2xl"
      />
      {/* та же бумажная рамка-тельняшка, что у баннера урока — витрина не выбивается из бренда */}
      <div className="banner-goose-frame relative overflow-hidden rounded-3xl px-6 pt-9 pb-32 sm:px-12 sm:py-12">
        <Image
          src="/banner-home-goose.webp"
          alt=""
          width={760}
          height={619}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 w-[140px] select-none sm:w-[240px] lg:w-[300px]"
        />
        <div className="relative max-w-xl space-y-4">
          <p className="font-mono text-sm text-brand-charcoal/70">подбор обучения</p>
          <h2 className="font-heading text-[1.75rem] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-brand-navy sm:text-[2.25rem]">
            Пройдите тест и&nbsp;узнайте, что подойдёт именно вам
          </h2>
          <p className="max-w-md leading-snug font-medium text-pretty text-brand-charcoal/80">
            Четыре вопроса про то, что у вас уже есть и чего хочется.
          </p>
          <button
            type="button"
            onClick={start}
            className="btn-goose mt-2 inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
          >
            <Sparkles className="size-4" aria-hidden />
            Пройти тест
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 p-0 sm:max-w-lg">
          <QuizBody onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}

function QuizBody({ onDone }: { onDone: () => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const step = answers.length;
  const question = QUIZ[step];

  function choose(optionIndex: number) {
    const next = [...answers, optionIndex];
    setAnswers(next);
    if (next.length === QUIZ.length) {
      const picked = pickQuizResult(next);
      track(EVENTS.quizCompleted, { result_slug: picked.slug });
      setResult(picked);
    }
  }

  if (result) {
    return (
      <div className="space-y-5 p-5 sm:p-7">
        <p className="font-mono text-xs tracking-wide text-primary uppercase">Ваш результат</p>
        <div className="space-y-2">
          <DialogTitle className="font-heading text-xl leading-tight font-semibold text-balance sm:text-2xl">
            {result.verdict}
          </DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{result.note}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Check className="size-4.5" aria-hidden />
          </span>
          <p className="text-[15px] leading-snug font-semibold">{result.title}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <Link
            href={`/courses/${result.slug}`}
            onClick={onDone}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            Открыть программу
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <a
            href={TELEGRAM_DM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Send className="size-3.5" aria-hidden />
            Сомневаюсь — обсудить лично
          </a>
          <button
            type="button"
            onClick={() => {
              setAnswers([]);
              setResult(null);
            }}
            className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Пройти заново
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Вопрос {step + 1} из {QUIZ.length}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {QUIZ.map((q, i) => (
            <span
              key={q.id}
              className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>

      <DialogTitle className="font-heading text-xl leading-tight font-semibold text-balance sm:text-2xl">
        {question.question}
      </DialogTitle>

      <ul className="space-y-2">
        {question.options.map((option, i) => (
          <li key={option.label}>
            <button
              type="button"
              onClick={() => choose(i)}
              className="group w-full rounded-2xl border border-border bg-card/60 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-sm motion-reduce:hover:translate-y-0"
            >
              <p className="text-[15px] leading-snug font-semibold transition-colors group-hover:text-primary">
                {option.label}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground text-pretty">{option.note}</p>
            </button>
          </li>
        ))}
      </ul>

      {step > 0 && (
        <button
          type="button"
          onClick={() => setAnswers(answers.slice(0, -1))}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Назад
        </button>
      )}
    </div>
  );
}
