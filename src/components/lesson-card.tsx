import Link from 'next/link';
import { LockBadge } from './lock-badge';
import type { Lesson } from '@/lib/types';

export function LessonCard({ lesson, locked }: { lesson: Lesson; locked: boolean }) {
  return (
    <Link
      href={`/courses/${lesson.courseId}/lessons/${lesson.id}`}
      className="w-56 shrink-0 snap-start space-y-2"
    >
      <div className="relative flex aspect-video items-center justify-center rounded-lg bg-muted">
        <span className="text-3xl font-semibold text-muted-foreground">
          {lesson.title.charAt(0)}
        </span>
        {locked && <LockBadge />}
      </div>
      <div>
        <p className="line-clamp-2 text-sm font-medium">{lesson.title}</p>
        {lesson.durationSec !== null && (
          <p className="text-xs text-muted-foreground">
            {Math.round(lesson.durationSec / 60)} мин
          </p>
        )}
      </div>
    </Link>
  );
}
