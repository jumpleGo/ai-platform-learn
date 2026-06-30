import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { CourseLessonsNav } from '@/components/course-lessons-nav';

// Общий каркас уроков курса: слева — плеер/контент (children, перезагружается при смене урока),
// справа — меню уроков. layout сегмента [courseId] не перемонтируется при навигации между уроками.
export default async function CourseLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getSession();
  const [courses, sub, completedIds] = await Promise.all([
    getPublishedCoursesWithLessons(),
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);

  const now = Date.now();
  const lessons = courses.find((c) => c.id === courseId)?.lessons ?? [];
  const items = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    locked: isLocked(l, sub, now),
    completed: completedIds.has(l.id),
  }));
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
      <div className="min-w-0">{children}</div>
      <CourseLessonsNav courseId={courseId} items={items} completedCount={completedCount} />
    </div>
  );
}
