import { cookies } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clapperboard, Eye, Lock } from 'lucide-react';
import { resolveLesson } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { materialsTeaser } from '@/lib/markdown';
import { plural } from '@/lib/utils';
import type { Lesson } from '@/lib/types';
import { courseKey, lessonPath } from '@/lib/slug';
import { pickVariant, slotVariants, variantSeed } from '@/lib/banners';
import { VideoEmbed } from '@/components/video-embed';
// Оффер закрытого урока — маркетинговый баннер на внешний лендинг
import { PromoLessonBanner } from '@/components/promo-banner';
import { CompleteLessonButton } from '@/components/complete-lesson-button';
import { TrackOnMount } from '@/components/track-on-mount';
import { RecordView } from '@/components/record-view';
import { Markdown } from '@/components/markdown';
import { MaterialsTeaser } from '@/components/materials-teaser';
import { WatchingNow } from '@/components/watching-now';
import { DoodleScatter } from '@/components/doodle-decor';
import { BannerSlotView } from '@/components/banner-slot';
import { EVENTS } from '@/lib/analytics/events';
import { recordViewAction } from './actions';

export default async function LessonPage({ params }: {
  params: Promise<{ courseSlug: string; lessonNumber: string }>;
}) {
  const { courseSlug, lessonNumber } = await params;
  // страница урока открыта и гостям; платный урок без доступа отдаётся заблокированным (только превью)
  const session = await getSession();
  const [data, sub, completedIds] = await Promise.all([
    resolveLesson(courseSlug, lessonNumber),
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);
  if (!data) notFound();
  const { course, lesson, number } = data;
  // пришли по старому адресу с хешами — уводим на человекочитаемый
  const path = lessonPath(courseKey(course), number);
  if (courseSlug !== courseKey(course) || lessonNumber !== String(number)) permanentRedirect(path);
  // id документов нужны для аналитики, прогресса и прокси-плеера — они не участвуют в URL страницы
  const courseId = course.id;
  const lessonId = lesson.id;

  const now = Date.now();
  const locked = isLocked(lesson, sub, now);
  // Чувствительные поля не уходят клиенту без доступа: ссылку на видео клиент не получает вовсе
  // (плеер грузится через прокси-роут), вместо полных материалов — оглавление разделов
  const materials = locked ? '' : lesson.materials;
  const teaser = locked && lesson.materials ? materialsTeaser(lesson.materials) : null;
  const views = lesson.views ?? 0;
  // Вариант маркетингового блока залипает за посетителем: id из cookie (её ставит proxy),
  // выбор — по весам в админке. Показы и клики считает BannerSlotView.
  const visitorId = (await cookies()).get('vid')?.value ?? 'anon';
  const banners = (['materials', 'related'] as const).map((slot) => ({
    slot,
    variant: pickVariant(slotVariants(lesson, slot), variantSeed(visitorId, lessonId, slot)),
  }));
  const [materialsBanner, relatedBanner] = banners;

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
      <LessonChrome lesson={lesson} />
      <div className="animate-rise relative space-y-6">
        <DoodleScatter
          glyph="starburst"
          color="oklch(0.78 0.16 85)"
          className="top-0 right-1 h-7 w-7 -rotate-6 opacity-80 sm:h-9 sm:w-9 sm:right-2"
        />
        <DoodleScatter
          glyph="mandala"
          color="oklch(0.7 0.16 160)"
          className="top-9 right-9 h-8 w-8 rotate-3 opacity-60 sm:top-16 sm:right-16 sm:h-10 sm:w-10"
        />
        <DoodleScatter
          glyph="sparkleheart"
          color="oklch(0.68 0.19 12)"
          className="-top-7 -left-1 h-7 w-8 -rotate-6 opacity-55 sm:-top-9 sm:h-9 sm:w-10"
        />
        <DoodleScatter
          glyph="paisley"
          color="oklch(0.7 0.14 240)"
          className="bottom-2 left-2 h-7 w-7 rotate-3 opacity-45 sm:h-9 sm:w-9"
        />
        {!lesson.hideBackLink && (
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            {course.title}
          </Link>
        )}
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
        <div className="overflow-hidden rounded-2xl border border-border shadow-md">
          {locked ? (
            <LockedVideo previewUrl={lesson.previewImageUrl} title={lesson.title} />
          ) : lesson.videoEmbedUrl ? (
            <VideoEmbed courseId={courseId} lessonId={lessonId} title={lesson.title} />
          ) : (
            <MissingVideo />
          )}
        </div>
        {locked && <PromoLessonBanner />}
        {lesson.description && (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">{lesson.description}</p>
        )}
        {(materials || teaser) && (
          <div className="max-w-2xl rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
            <p className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">Материалы урока</p>
            {teaser ? <MaterialsTeaser teaser={teaser} /> : <Markdown source={materials} />}
            {locked && (
              <p className="mt-4 text-sm text-muted-foreground">
                Полные материалы откроются после оформления подписки.
              </p>
            )}
          </div>
        )}
        {materialsBanner.variant && (
          <BannerSlotView
            key={`materials:${lessonId}:${materialsBanner.variant.id}`}
            courseId={courseId}
            lessonId={lessonId}
            slot="materials"
            variantId={materialsBanner.variant.id}
            html={materialsBanner.variant.html}
          />
        )}
        {session && !locked && (
          <CompleteLessonButton
            courseId={courseId}
            lessonId={lesson.id}
            path={path}
            completed={completedIds.has(lesson.id)}
          />
        )}
        {relatedBanner.variant && (
          <BannerSlotView
            key={`related:${lessonId}:${relatedBanner.variant.id}`}
            courseId={courseId}
            lessonId={lessonId}
            slot="related"
            variantId={relatedBanner.variant.id}
            html={relatedBanner.variant.html}
          />
        )}
      </div>
    </>
  );
}

// Фокус-режим урока: правила глобальные, но живут только пока смонтирована страница этого
// урока — при переходе на другой урок React снимает <style> и обвязка возвращается.
// precedence не ставим намеренно: иначе React поднял бы стиль в <head> и закешировал.
function LessonChrome({ lesson }: { lesson: Lesson }) {
  const css = [
    lesson.hideHeader && '[data-app-header],[data-app-partner-bar]{display:none}',
    lesson.hideFooter && '[data-app-footer]{display:none}',
    lesson.hideLessonsNav && '[data-lessons-nav]{display:none}[data-course-grid]{grid-template-columns:1fr}',
  ].filter(Boolean).join('');
  if (!css) return null;
  return <style>{css}</style>;
}


// У урока тестового курса ссылки на видео может не быть — вместо плеера заглушка
function MissingVideo() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-secondary text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15">
        <Clapperboard className="size-5 text-primary" aria-hidden />
      </span>
      <p className="px-6 text-sm font-medium text-foreground/90">Видео скоро появится</p>
    </div>
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
