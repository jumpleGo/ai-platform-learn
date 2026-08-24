'use client';

import { ArrowRight } from 'lucide-react';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

export function FreeLessonCta({
  href,
  label,
  lessonId,
  position,
  className = '',
}: {
  href: string;
  label: string;
  lessonId: string;
  position: 'primary' | 'bottom';
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={() => track(EVENTS.lessonCtaClicked, {
        lesson_id: lessonId,
        cta_position: position,
        destination: 'vibe.gelato.education',
      })}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${className}`}
    >
      {label}
      <ArrowRight className="size-4 shrink-0" aria-hidden />
    </a>
  );
}

export function FreeLessonTelegramLink({ lessonId, position, href }: {
  lessonId: string;
  position: 'primary' | 'bottom';
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EVENTS.telegramClicked, {
        lesson_id: lessonId,
        cta_position: position,
      })}
      className="text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
    >
      Есть вопрос по программе? Написать Эмилю
    </a>
  );
}
