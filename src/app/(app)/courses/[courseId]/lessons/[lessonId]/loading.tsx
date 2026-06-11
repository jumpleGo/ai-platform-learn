import { Skeleton } from '@/components/ui/skeleton';

// Скелетон урока: видео-блок и сайдбар появляются мгновенно при переходе
export default function LessonLoading() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
