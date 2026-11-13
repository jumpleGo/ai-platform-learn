'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

export function FreeIntroLessonButton() {
  return (
    <Link
      href="/courses/claude-code-agents/lessons/1"
      onClick={() => track(EVENTS.freeCtaClicked, {
        target: 'claude-code-agents/lessons/1',
      })}
      className="btn-goose mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-5 py-3 text-center font-bold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
    >
      Бесплатный вводный урок
      <ArrowRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}
