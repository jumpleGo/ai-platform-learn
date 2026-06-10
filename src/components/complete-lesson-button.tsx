'use client';
import { useTransition } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { completeLesson } from '@/app/(app)/courses/[courseId]/lessons/[lessonId]/actions';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

export function CompleteLessonButton({ courseId, lessonId, completed }: {
  courseId: string;
  lessonId: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary">
        <Check className="size-4" aria-hidden />
        Пройдено
      </span>
    );
  }

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await completeLesson(courseId, lessonId);
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
