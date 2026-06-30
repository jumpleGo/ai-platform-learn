'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Lock } from 'lucide-react';

export type NavItem = { id: string; title: string; locked: boolean; completed: boolean };

// Меню уроков курса. Живёт в layout сегмента [courseId], поэтому при переходе между
// уроками не перемонтируется — активный урок подсвечивается на клиенте через useParams.
export function CourseLessonsNav({ courseId, items, completedCount }: {
  courseId: string;
  items: NavItem[];
  completedCount: number;
}) {
  const { lessonId } = useParams<{ lessonId: string }>();
  const total = items.length;
  return (
    <aside
      className="animate-rise space-y-4 lg:sticky lg:top-20 lg:self-start"
      style={{ '--rise-delay': '0.08s' } as React.CSSProperties}
    >
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Уроки курса</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {completedCount}/{total}
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${total ? (completedCount / total) * 100 : 0}%` }}
          />
        </div>
        <ul className="space-y-1">
          {items.map((l, i) => {
            const active = l.id === lessonId;
            return (
              <li key={l.id}>
                <Link
                  href={`/courses/${courseId}/lessons/${l.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${
                    active
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className={`font-mono text-xs ${active ? 'text-primary' : 'text-muted-foreground/60'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="line-clamp-1 flex-1">{l.title}</span>
                  {l.completed && (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  )}
                  {l.locked && (
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
