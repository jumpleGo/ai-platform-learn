'use client';

import Link from 'next/link';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

export function LandingLessonCta({ courseSlug }: { courseSlug: string }) {
  return (
    <Link
      href={`/courses/${courseSlug}/lessons/1`}
      onClick={() => track(EVENTS.landingLessonCtaClicked, {
        course: courseSlug, target: 'lesson1',
      })}
      className="mt-6 inline-flex min-h-11 items-center font-bold text-brand-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
    >
      Начать с первого урока
    </Link>
  );
}
