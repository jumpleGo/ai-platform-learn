'use client';
import { useTransition } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { completeLesson } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

export function CompleteLessonButton({ courseId, lessonId, path, completed }: {
  courseId: string;
  lessonId: string;
  // Адрес урока для ревалидации после отметки о прохождении
  path: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (completed) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary">
          <Check className="size-4" aria-hidden />
          Пройдено
        </span>
        <p className="text-sm text-muted-foreground">
          Отлично! Завтра продолжите со следующего урока
        </p>
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
