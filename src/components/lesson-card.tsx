import Link from 'next/link';
import { Play } from 'lucide-react';
import { LockBadge } from './lock-badge';
import type { Lesson } from '@/lib/types';

// Превью урока в виде окна терминала — тематика Claude Code
export function LessonCard({ lesson, index, locked }: { lesson: Lesson; index: number; locked: boolean }) {
  const num = String(index + 1).padStart(2, '0');
  return (
    <Link
      href={`/courses/${lesson.courseId}/lessons/${lesson.id}`}
      className="group animate-float w-60 shrink-0 snap-start space-y-2.5"
      // лёгкий каскад появления карточек (ограничиваем, чтобы дальние не висели прозрачными)
      style={{ '--rise-delay': `${Math.min(index, 6) * 0.05}s` } as React.CSSProperties}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
        <div className="flex h-6 items-center gap-1.5 border-b border-border/70 bg-secondary px-2.5">
          <span className="size-2 rounded-full bg-destructive/50" aria-hidden />
          <span className="size-2 rounded-full bg-chart-2/60" aria-hidden />
          <span className="size-2 rounded-full bg-chart-3/60" aria-hidden />
          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">lesson_{num}</span>
        </div>
        <div className="flex h-[calc(100%-1.5rem)] flex-col justify-between p-3">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-primary">❯</span> claude run
          </p>
          <div className="flex items-center justify-between">
            <span className="font-heading text-3xl font-semibold text-foreground/15 transition-colors duration-200 group-hover:text-foreground/25">
              {num}
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 motion-reduce:opacity-100">
              <Play className="size-4 fill-current" aria-hidden />
            </span>
          </div>
        </div>
        {locked && <LockBadge />}
      </div>
      <div className="space-y-0.5 px-0.5">
        <p className="line-clamp-2 text-sm font-medium transition-colors duration-200 group-hover:text-primary">
          {lesson.title}
        </p>
        {lesson.durationSec !== null && (
          <p className="font-mono text-xs text-muted-foreground">
            {Math.max(1, Math.round(lesson.durationSec / 60))} мин
          </p>
        )}
      </div>
    </Link>
  );
}
