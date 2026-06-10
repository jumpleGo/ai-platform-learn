import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { getLesson, getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { VideoEmbed } from '@/components/video-embed';
import { PaywallBanner } from '@/components/paywall-banner';
import { CompleteLessonButton } from '@/components/complete-lesson-button';

export default async function LessonPage({ params }: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const [data, session, courses] = await Promise.all([
    getLesson(courseId, lessonId),
    getSession(),
    getPublishedCoursesWithLessons(),
  ]);
  if (!data) notFound();
  const { course, lesson } = data;

  const [sub, completedIds] = await Promise.all([
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);

  const now = Date.now();
  const locked = isLocked(lesson, course, sub, now);
  const courseLessons = courses.find((c) => c.id === courseId)?.lessons ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {course.title}
        </Link>
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        {locked && <PaywallBanner />}
        <VideoEmbed url={lesson.videoEmbedUrl} title={lesson.title} />
        {lesson.description && (
          <p className="text-muted-foreground">{lesson.description}</p>
        )}
        <CompleteLessonButton
          courseId={courseId}
          lessonId={lesson.id}
          completed={completedIds.has(lesson.id)}
        />
      </div>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Уроки курса
        </h2>
        <ul className="space-y-1">
          {courseLessons.map((l) => {
            const active = l.id === lesson.id;
            return (
              <li key={l.id}>
                <Link
                  href={`/courses/${courseId}/lessons/${l.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm ${
                    active ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <span className="line-clamp-1 flex-1">{l.title}</span>
                  {completedIds.has(l.id) && (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  )}
                  {isLocked(l, course, sub, now) && (
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
