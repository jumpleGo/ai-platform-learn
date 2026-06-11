import { notFound, redirect } from 'next/navigation';
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
import { TrackOnMount } from '@/components/track-on-mount';
import { EVENTS } from '@/lib/analytics/events';

export default async function LessonPage({ params }: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  // уроки доступны только авторизованным; гостей с главной отправляем на вход
  const session = await getSession();
  if (!session) redirect('/login');
  // один барьер вместо двух: зависимые от сессии запросы стартуют сразу после неё,
  // не дожидаясь урока и каталога
  const sessionP = getSession();
  const [data, courses, sub, completedIds] = await Promise.all([
    getLesson(courseId, lessonId),
    getPublishedCoursesWithLessons(),
    sessionP.then((s) => (s ? getSubscription(s.uid) : null)),
    sessionP.then((s) => (s ? getCompletedLessonIds(s.uid) : new Set<string>())),
  ]);
  if (!data) notFound();
  const { course, lesson } = data;

  const now = Date.now();
  const locked = isLocked(lesson, sub, now);
  const courseLessons = courses.find((c) => c.id === courseId)?.lessons ?? [];
  const completedCount = courseLessons.filter((l) => completedIds.has(l.id)).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
      {/* key — иначе React реюзает компонент при навигации между уроками и событие не уходит */}
      <TrackOnMount
        key={`opened:${courseId}:${lessonId}`}
        event={EVENTS.lessonOpened}
        props={{ courseId, lessonId, locked }}
      />
      {locked && (
        <TrackOnMount
          key={`paywall:${courseId}:${lessonId}`}
          event={EVENTS.paywallViewed}
          props={{ courseId, lessonId }}
        />
      )}
      <div className="animate-rise space-y-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
          {course.title}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl/[1.15]">
          {lesson.title}
        </h1>
        {locked && <PaywallBanner />}
        <div className="overflow-hidden rounded-2xl border border-border shadow-md">
          <VideoEmbed url={lesson.videoEmbedUrl} title={lesson.title} />
        </div>
        {lesson.description && (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">{lesson.description}</p>
        )}
        <CompleteLessonButton
          courseId={courseId}
          lessonId={lesson.id}
          completed={completedIds.has(lesson.id)}
        />
      </div>

      <aside
        className="animate-rise space-y-4 lg:sticky lg:top-20 lg:self-start"
        style={{ '--rise-delay': '0.08s' } as React.CSSProperties}
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Уроки курса</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {completedCount}/{courseLessons.length}
            </span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${courseLessons.length ? (completedCount / courseLessons.length) * 100 : 0}%` }}
            />
          </div>
          <ul className="space-y-1">
            {courseLessons.map((l, i) => {
              const active = l.id === lesson.id;
              return (
                <li key={l.id}>
                  <Link
                    href={`/courses/${courseId}/lessons/${l.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${
                      active
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className={`font-mono text-xs ${active ? 'text-primary' : 'text-muted-foreground/60'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="line-clamp-1 flex-1">{l.title}</span>
                    {completedIds.has(l.id) && (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    )}
                    {isLocked(l, sub, now) && (
                      <Lock className="size-3.5 shrink-0" aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
