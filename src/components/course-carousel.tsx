import { LessonCard } from './lesson-card';
import type { Course, Lesson } from '@/lib/types';

export function CourseCarousel({ course, lessons, lockedIds }: {
  course: Course; lessons: Lesson[]; lockedIds: string[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{course.title}</h2>
        <p className="text-sm text-muted-foreground">{course.description}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x pb-2">
        {lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} locked={lockedIds.includes(l.id)} />
        ))}
      </div>
    </section>
  );
}
