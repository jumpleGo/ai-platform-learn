'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

const INTRO_LESSON_HREF = '/courses/claude-code-agents/lessons/1';
const INTRO_LESSON_TITLE = 'Попробуйте сами: бесплатный вводный урок';

export function BlogLessonNextStep({ slug, position }: {
  slug: string;
  position: 'after_first_third' | 'after_body';
}) {
  const headingId = `post-next-step-${position}`;
  return (
    <section aria-labelledby={headingId} data-blog-cta-position={position} className="mt-12 rounded-2xl border-2 border-brand-navy/12 bg-brand-yellow/20 p-6">
      <h2 id={headingId} className="font-heading text-2xl font-extrabold tracking-tight text-brand-navy">
        Следующий шаг
      </h2>
      <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
        Попробуйте сами: во вводном уроке вы узнаете, что такое Claude Code
        и как начать решать свои задачи с помощью ИИ. Опыт программирования не нужен.
      </p>
      <Link
        href={INTRO_LESSON_HREF}
        onClick={() => track(EVENTS.blogCtaClicked, { slug, position })}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-5 py-3 font-bold text-brand-navy transition-colors hover:bg-brand-yellow/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
      >
        {INTRO_LESSON_TITLE}
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
    </section>
  );
}
