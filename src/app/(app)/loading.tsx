import { Skeleton } from '@/components/ui/skeleton';

// Скелетон главной: переход показывается мгновенно, пока грузятся курсы
export default function HomeLoading() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <div className="space-y-5 pt-4 sm:pt-8">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-6 w-full max-w-md" />
      </div>
      {[0, 1].map((section) => (
        <div key={section} className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0" />
          </div>
          <div className="flex gap-4 overflow-hidden pb-3">
            {[0, 1, 2, 3, 4].map((card) => (
              <div key={card} className="w-60 shrink-0 space-y-2.5">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
