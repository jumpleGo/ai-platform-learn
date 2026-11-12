'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

export function AgentsIntroNextStep() {
  return (
    <section
      aria-label="Продолжить обучение"
      data-lesson-next-step="course"
      className="rounded-2xl border-2 border-brand-navy/15 bg-brand-yellow/20 p-5 sm:p-6"
    >
      <p className="leading-relaxed text-brand-navy text-pretty">
        Вводный урок завершён. Чтобы продолжить обучение, посмотрите программу курса и цены.
      </p>
      <Link
        href="/courses/claude-code-agents"
        onClick={() => track(EVENTS.lessonNextClicked, {
          course: 'claude-code-agents', lesson: 1, target: 'course',
        })}
        className="btn-scarf mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-5 py-3 text-center font-bold text-brand-navy transition-colors hover:bg-brand-yellow/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
      >
        Посмотреть программу и цены
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
    </section>
  );
}
