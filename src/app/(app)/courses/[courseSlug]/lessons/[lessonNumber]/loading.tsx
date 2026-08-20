import { Skeleton } from '@/components/ui/skeleton';

// Скелетон только контента урока — меню курса живёт в layout и при переходе не перезагружается
export default function LessonLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <Skeleton className="h-9 w-36" />
    </div>
  );
}
