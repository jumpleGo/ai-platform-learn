import { cookies } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
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
import { isBannerSlot, pickVariant, slotVariants, variantSeed } from '@/lib/banners';
import { VideoEmbed } from '@/components/video-embed';
// Оффер закрытого урока — маркетинговый баннер на внешний лендинг
import { PromoLessonBanner } from '@/components/promo-banner';
import { CompleteLessonButton } from '@/components/complete-lesson-button';
import { TrackOnMount } from '@/components/track-on-mount';
import { RecordView } from '@/components/record-view';
import { Markdown } from '@/components/markdown';
import { MaterialsTeaser } from '@/components/materials-teaser';
import { WatchingNow } from '@/components/watching-now';
import { BannerSlotView } from '@/components/banner-slot';
import { FreeLessonAnalytics } from '@/components/free-lesson-analytics';
import { FreeLessonAfterVideo, FreeLessonMarker } from '@/components/free-lesson-funnel';
import { EVENTS } from '@/lib/analytics/events';
import {
  SITE_URL, buildProgramUrl, getFreeLessonContent, isoDuration, type FreeLessonContent,
} from '@/lib/free-lessons';
import { recordViewAction } from './actions';

type LessonSearchParams = Record<string, string | string[] | undefined> & { banner?: string };

export async function generateMetadata({ params }: {
  params: Promise<{ courseSlug: string; lessonNumber: string }>;
}): Promise<Metadata> {
  const { courseSlug, lessonNumber } = await params;
  const data = await resolveLesson(courseSlug, lessonNumber);
  if (!data) return {};
  const canonicalCourseSlug = courseKey(data.course);
  const content = getFreeLessonContent(canonicalCourseSlug, data.number);
  if (!content) {
    return {
      title: `${data.lesson.title} — ${data.course.title}`,
      description: data.lesson.description || data.course.description,
    };
  }
  const canonical = `${SITE_URL}${lessonPath(canonicalCourseSlug, data.number)}`;
  return {
    title: content.seoTitle,
    description: content.seoDescription,
    alternates: { canonical },
    openGraph: {
      type: 'video.other',
      url: canonical,
      title: content.seoTitle,
      description: content.seoDescription,
      images: data.lesson.previewImageUrl
        ? [{ url: data.lesson.previewImageUrl, alt: content.h1 }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.seoTitle,
      description: content.seoDescription,
      images: data.lesson.previewImageUrl ? [data.lesson.previewImageUrl] : undefined,
    },
  };
}

function freeLessonJsonLd({
  content,
  courseTitle,
  courseSlug,
  lessonNumber,
  courseId,
  lessonDocumentId,
  previewImageUrl,
  durationSec,
  publishedAt,
}: {
  content: FreeLessonContent;
  courseTitle: string;
  courseSlug: string;
  lessonNumber: number;
  courseId: string;
  lessonDocumentId: string;
  previewImageUrl: string | null;
  durationSec: number | null;
  publishedAt: string;
}) {
  const canonical = `${SITE_URL}${lessonPath(courseSlug, lessonNumber)}`;
  const courseUrl = `${SITE_URL}/courses/${courseSlug}/lessons/1`;
  const videoId = `${canonical}#video`;
  const courseSchemaId = `${courseUrl}#course`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Course',
      '@id': courseSchemaId,
      name: courseTitle,
      description: 'Практическая программа Gelato Dev о системной и проверяемой AI-разработке на реальном проекте.',
      provider: { '@type': 'Organization', name: 'Gelato Dev', url: 'https://vibe.gelato.education' },
    },
    {
      '@type': 'LearningResource',
      '@id': `${canonical}#lesson`,
      name: content.h1,
      description: content.seoDescription,
      url: canonical,
      inLanguage: 'ru',
      educationalLevel: 'Начальный',
      learningResourceType: 'Видеоурок',
      datePublished: publishedAt,
      isPartOf: { '@id': courseSchemaId },
      associatedMedia: { '@id': videoId },
    },
    {
      '@type': 'VideoObject',
      '@id': videoId,
      name: content.h1,
      description: content.seoDescription,
      uploadDate: publishedAt,
      duration: isoDuration(durationSec),
      thumbnailUrl: previewImageUrl ? [previewImageUrl] : undefined,
      embedUrl: `${SITE_URL}/api/player/${courseId}/${lessonDocumentId}`,
      inLanguage: 'ru',
      isFamilyFriendly: true,
    },
  ];
  return { '@context': 'https://schema.org', '@graph': graph };
}

export default async function LessonPage({ params, searchParams }: {
  params: Promise<{ courseSlug: string; lessonNumber: string }>;
  searchParams: Promise<LessonSearchParams>;
}) {
  const { courseSlug, lessonNumber } = await params;
  const query = await searchParams;
  // ?banner=materials:b — открыть урок с конкретным вариантом (предпросмотр из админки)
  const forcedBanner = Array.isArray(query.banner) ? query.banner[0] : query.banner;
  const [forcedSlot, forcedVariant] = (forcedBanner ?? '').split(':');
  // страница урока открыта и гостям; платный урок без доступа отдаётся заблокированным (только превью)
  const session = await getSession();
  const [data, sub, completedIds] = await Promise.all([
    resolveLesson(courseSlug, lessonNumber),
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);
  if (!data) notFound();
  const { course, lesson, number, publishedAt } = data;
  // пришли по старому адресу с хешами — уводим на человекочитаемый
  const path = lessonPath(courseKey(course), number);
  if (courseSlug !== courseKey(course) || lessonNumber !== String(number)) permanentRedirect(path);
  // id документов нужны для аналитики, прогресса и прокси-плеера — они не участвуют в URL страницы
  const courseId = course.id;
  const lessonId = lesson.id;
  const freeLesson = lesson.access === 'free' ? getFreeLessonContent(courseKey(course), number) : null;
  const ctaHref = freeLesson ? buildProgramUrl(freeLesson, query) : null;

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
  const banners = (['materials', 'related'] as const).map((slot) => {
    const variants = slotVariants(lesson, slot);
    // принудительный вариант показываем как есть и не считаем в статистике
    const forced = isBannerSlot(forcedSlot) && forcedSlot === slot
      ? variants.find((v) => v.id === forcedVariant)
      : undefined;
    return {
      slot,
      preview: Boolean(forced),
      variant: forced ?? pickVariant(variants, variantSeed(visitorId, lessonId, slot)),
    };
  });
  const [materialsBanner, relatedBanner] = banners;

  return (
    <>
      {/* key — иначе React реюзает компонент при навигации между уроками и событие не уходит */}
      {freeLesson ? (
        <FreeLessonAnalytics
          key={`viewed:${courseId}:${lessonId}`}
          courseId={courseId}
          lessonDocumentId={lessonId}
          lessonId={freeLesson.lessonId}
          source={(Array.isArray(query.source) ? query.source[0] : query.source)
            ?? (Array.isArray(query.utm_source) ? query.utm_source[0] : query.utm_source)
            ?? 'direct'}
          campaign={(Array.isArray(query.campaign) ? query.campaign[0] : query.campaign)
            ?? (Array.isArray(query.utm_campaign) ? query.utm_campaign[0] : query.utm_campaign)
            ?? 'gelato_dev'}
        />
      ) : (
        <TrackOnMount
          key={`opened:${courseId}:${lessonId}`}
          event={EVENTS.lessonOpened}
          props={{ courseId, lessonId, locked }}
        />
      )}
      {locked && (
        <TrackOnMount
          key={`paywall:${courseId}:${lessonId}`}
          event={EVENTS.paywallViewed}
          props={{ courseId, lessonId }}
        />
      )}
      <RecordView key={`view:${courseId}:${lessonId}`} action={recordViewAction.bind(null, courseId, lessonId)} />
      {freeLesson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(freeLessonJsonLd({
              content: freeLesson,
              courseTitle: course.title,
              courseSlug: courseKey(course),
              lessonNumber: number,
              courseId,
              lessonDocumentId: lessonId,
              previewImageUrl: lesson.previewImageUrl,
              durationSec: lesson.durationSec,
              publishedAt,
            })).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <LessonChrome
        lesson={lesson}
        hideLessonsNav={Boolean(freeLesson && !session)}
        funnelMode={Boolean(freeLesson)}
      />
      <div className="animate-rise relative space-y-6">
        {freeLesson ? <FreeLessonMarker /> : !lesson.hideBackLink && (
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            {course.title}
          </Link>
        )}
        <h1 className={freeLesson
          ? 'max-w-4xl font-heading text-3xl/[1.1] font-semibold tracking-tight text-balance sm:text-4xl/[1.08]'
          : 'font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl/[1.15]'}>
          {freeLesson?.h1 ?? lesson.title}
        </h1>
        {freeLesson && <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{freeLesson.lead}</p>}
        {!freeLesson && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground">
            <WatchingNow seed={views} />
            {views > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-3.5" aria-hidden />
                {views.toLocaleString('ru-RU')} {plural(views, ['просмотр', 'просмотра', 'просмотров'])}
              </span>
            )}
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-border shadow-md">
          {locked ? (
            <LockedVideo previewUrl={lesson.previewImageUrl} title={lesson.title} />
          ) : lesson.videoEmbedUrl ? (
            <VideoEmbed
              courseId={courseId}
              lessonId={lessonId}
              title={freeLesson?.h1 ?? lesson.title}
              analyticsLessonId={freeLesson?.lessonId}
            />
          ) : (
            <MissingVideo />
          )}
        </div>
        {locked && !freeLesson && <PromoLessonBanner />}
        {!freeLesson && lesson.description && (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">{lesson.description}</p>
        )}
        {!freeLesson && (materials || teaser) && (
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
        {!freeLesson && materialsBanner.variant && (
          <BannerSlotView
            key={`materials:${lessonId}:${materialsBanner.variant.id}`}
            courseId={courseId}
            lessonId={lessonId}
            slot="materials"
            variantId={materialsBanner.variant.id}
            html={materialsBanner.variant.html}
            preview={materialsBanner.preview}
          />
        )}
        {!freeLesson && session && !locked && (
          <CompleteLessonButton
            courseId={courseId}
            lessonId={lesson.id}
            path={path}
            completed={completedIds.has(lesson.id)}
          />
        )}
        {!freeLesson && relatedBanner.variant && (
          <BannerSlotView
            key={`related:${lessonId}:${relatedBanner.variant.id}`}
            courseId={courseId}
            lessonId={lessonId}
            slot="related"
            variantId={relatedBanner.variant.id}
            html={relatedBanner.variant.html}
            preview={relatedBanner.preview}
          />
        )}
        {freeLesson && ctaHref && (
          <FreeLessonAfterVideo content={freeLesson} materials={materials} ctaHref={ctaHref} />
        )}
      </div>
    </>
  );
}

// Фокус-режим урока: правила глобальные, но живут только пока смонтирована страница этого
// урока — при переходе на другой урок React снимает <style> и обвязка возвращается.
// precedence не ставим намеренно: иначе React поднял бы стиль в <head> и закешировал.
function LessonChrome({ lesson, hideLessonsNav = false, funnelMode = false }: {
  lesson: Lesson;
  hideLessonsNav?: boolean;
  funnelMode?: boolean;
}) {
  const css = [
    lesson.hideHeader && '[data-app-header],[data-app-partner-bar]{display:none}',
    (lesson.hideFooter || funnelMode) && '[data-app-footer]{display:none}',
    (lesson.hideLessonsNav || hideLessonsNav) && '[data-lessons-nav]{display:none}[data-course-grid]{grid-template-columns:1fr}',
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
