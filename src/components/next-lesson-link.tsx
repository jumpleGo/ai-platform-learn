'use client';

import Link from 'next/link';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import { lessonPath } from '@/lib/slug';

export function NextLessonLink({ courseSlug, fromLesson, toLesson, title }: {
  courseSlug: string;
  fromLesson: number;
  toLesson: number;
  title: string;
}) {
  return (
    <Link
      href={lessonPath(courseSlug, toLesson)}
      onClick={() => track(EVENTS.lessonNextClicked, {
        course_slug: courseSlug, from_lesson: fromLesson, to_lesson: toLesson,
      })}
      className="btn-scarf inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-brand-navy px-5 py-3 text-center font-bold text-brand-navy transition-colors hover:bg-brand-yellow/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
    >
      Следующий урок: {title} →
    </Link>
  );
}
