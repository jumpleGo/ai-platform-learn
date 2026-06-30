import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Lock } from 'lucide-react';
import { getLesson } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { materialsPreview } from '@/lib/markdown';
import { plural } from '@/lib/utils';
import { VideoEmbed } from '@/components/video-embed';
import { PaywallBanner } from '@/components/paywall-banner';
import { CompleteLessonButton } from '@/components/complete-lesson-button';
import { TrackOnMount } from '@/components/track-on-mount';
import { RecordView } from '@/components/record-view';
import { Markdown } from '@/components/markdown';
import { WatchingNow } from '@/components/watching-now';
import { EVENTS } from '@/lib/analytics/events';
import { recordViewAction } from './actions';

export default async function LessonPage({ params }: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  // страница урока открыта и гостям; платный урок без доступа отдаётся заблокированным (только превью)
  const session = await getSession();
  const [data, sub, completedIds] = await Promise.all([
    getLesson(courseId, lessonId),
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);
  if (!data) notFound();
  const { course, lesson } = data;

  const now = Date.now();
  const locked = isLocked(lesson, sub, now);
  // Чувствительные поля не уходят клиенту без доступа: ссылку на видео клиент не получает вовсе
  // (плеер грузится через прокси-роут), полные материалы заменяем короткой выжимкой (1-2 строки)
  const materials = lesson.materials
    ? (locked ? materialsPreview(lesson.materials) : lesson.materials)
    : '';
  const views = lesson.views ?? 0;

  return (
    <>
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
      <RecordView key={`view:${courseId}:${lessonId}`} action={recordViewAction.bind(null, courseId, lessonId)} />
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground">
          <WatchingNow seed={views} />
          {views > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5" aria-hidden />
              {views.toLocaleString('ru-RU')} {plural(views, ['просмотр', 'просмотра', 'просмотров'])}
            </span>
          )}
        </div>
        {locked && <PaywallBanner />}
        <div className="overflow-hidden rounded-2xl border border-border shadow-md">
          {locked ? (
            <LockedVideo previewUrl={lesson.previewImageUrl} title={lesson.title} />
          ) : (
            <VideoEmbed courseId={courseId} lessonId={lessonId} title={lesson.title} />
          )}
        </div>
        {lesson.description && (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">{lesson.description}</p>
        )}
        {materials && (
          <div className="max-w-2xl rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
            <p className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">Материалы урока</p>
            <Markdown source={materials} />
            {locked && (
              <p className="mt-4 text-sm text-muted-foreground">
                Полные материалы откроются после оформления подписки.
              </p>
            )}
          </div>
        )}
        {session && !locked && (
          <CompleteLessonButton
            courseId={courseId}
            lessonId={lesson.id}
            completed={completedIds.has(lesson.id)}
          />
        )}
      </div>
    </>
  );
}

// Постер заблокированного урока: только загруженное превью (кадр из видео не используем —
// он раскрыл бы id ролика и фактически ссылку)
function LockedVideo({ previewUrl, title }: { previewUrl: string | null; title: string }) {
  return (
    <div className="relative aspect-video w-full bg-black">
      {previewUrl && (
        <img src={previewUrl} alt={title} className="size-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/15">
          <Lock className="size-5 text-primary" aria-hidden />
        </span>
        <p className="px-6 text-sm font-medium text-foreground/90">Видео доступно по подписке</p>
      </div>
    </div>
  );
}
