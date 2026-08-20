import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { CourseLessonsNav } from '@/components/course-lessons-nav';
import { courseKey } from '@/lib/slug';

// Общий каркас уроков курса: слева — плеер/контент (children, перезагружается при смене урока),
// справа — меню уроков. layout сегмента [courseSlug] не перемонтируется при навигации между уроками.
export default async function CourseLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const session = await getSession();
  const [courses, sub, completedIds] = await Promise.all([
    getPublishedCoursesWithLessons(),
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);

  const now = Date.now();
  // курс ищем по slug, но принимаем и id — со старых ссылок страница урока делает редирект
  const course = courses.find((c) => courseKey(c) === courseSlug || c.id === courseSlug);
  const lessons = course?.lessons ?? [];
  const items = lessons.map((l, i) => ({
    id: l.id,
    number: i + 1,
    title: l.title,
    locked: isLocked(l, sub, now),
    completed: completedIds.has(l.id),
  }));
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
      <div className="min-w-0">{children}</div>
      <CourseLessonsNav courseKey={course ? courseKey(course) : courseSlug} items={items} completedCount={completedCount} />
    </div>
  );
}
