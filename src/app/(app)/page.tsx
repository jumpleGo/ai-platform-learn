import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { CourseCarousel } from '@/components/course-carousel';

export default async function HomePage() {
  const session = await getSession();
  const [courses, sub] = await Promise.all([
    getPublishedCoursesWithLessons(),
    session ? getSubscription(session.uid) : null,
  ]);
  const now = Date.now();
  return (
    <div className="space-y-10">
      {courses.map((course) => (
        <CourseCarousel
          key={course.id}
          course={course}
          lessons={course.lessons}
          lockedIds={course.lessons.filter((l) => isLocked(l, course, sub, now)).map((l) => l.id)}
        />
      ))}
      {courses.length === 0 && (
        <p className="text-muted-foreground">Курсы скоро появятся.</p>
      )}
    </div>
  );
}
