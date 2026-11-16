'use client';
import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { completeLesson } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { pluralizeDays } from '@/lib/pluralize';

export { pluralizeDays };

export function CompleteLessonButton({ courseId, lessonId, path, completed, streakDays = 0, hasNextLesson = false }: {
  courseId: string;
  lessonId: string;
  // Адрес урока для ревалидации после отметки о прохождении
  path: string;
  completed: boolean;
  streakDays?: number;
  hasNextLesson?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [completedThisView, setCompletedThisView] = useState(false);

  if (completed) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary">
          <Check className="size-4" aria-hidden />
          Пройдено
        </span>
        {streakDays >= 2 && (
          <p className="text-sm text-muted-foreground">
            Вы учитесь {streakDays} {pluralizeDays(streakDays)} подряд
          </p>
        )}
        {completedThisView && hasNextLesson && (
          <p className="text-sm text-muted-foreground">
            Отлично! Завтра продолжите со следующего урока
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await completeLesson(lessonId, path);
            setCompletedThisView(true);
            track(EVENTS.lessonCompleted, { courseId, lessonId });
          } catch {
            toast.error('Не удалось сохранить прогресс');
          }
        })
      }
    >
      Урок пройден
    </Button>
  );
}
