import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Send, Sparkles } from 'lucide-react';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { freeLessonCards } from '@/lib/catalog';
import { localLessonPreview } from '@/lib/free-lessons';
import { lessonPath } from '@/lib/slug';
import { TELEGRAM_DM } from '@/lib/site';
import { Accent, StickerTag, TitleAccent } from '@/components/accent';
import { CoverCard } from '@/components/cover-card';
import { SectionHead } from '@/components/section-head';

export const metadata: Metadata = {
  title: 'Бесплатные материалы — уроки про работу с ИИ | GELATO',
  description:
    'Открытые уроки школы GELATO: как объяснять задачу ИИ, куда уходят токены и лимиты, почему модель выдумывает ответы и как заставить её проверять себя.',
  alternates: { canonical: '/free' },
};

export default async function FreePage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const fromLanding = params.from || cookieStore.get('from_landing')?.value;
  const isFromVibe = fromLanding === 'vibecoding';

  const courses = await getPublishedCoursesWithLessons();
  const lessons = freeLessonCards(courses);

  return (
    <div className="space-y-20 sm:space-y-24">
      {/* Хиро. Наклейка стоит вплотную к заголовку — это одна смысловая группа,
          пояснение отходит дальше. */}
      <section className="animate-rise pt-6 sm:pt-10">
        <StickerTag tone="yellow">без карты и подписки</StickerTag>
        <h1 className="mt-4 font-heading text-[clamp(2.6rem,7vw,5.25rem)]/[0.98] font-bold tracking-[-0.035em] text-balance text-brand-navy">
          <TitleAccent>Бесплатные</TitleAccent> материалы
        </h1>
        {/* подзаголовок — часть заголовка, а не отдельный блок: держим вплотную */}
        <p className="mt-2.5 max-w-2xl text-lg leading-[1.35] text-muted-foreground text-pretty sm:text-xl">
          Полноценные уроки: смотрите целиком и забирайте конспекты.
        </p>

        {isFromVibe && (
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border-2 border-brand-navy bg-brand-yellow/35 p-5 shadow-[0_4px_0_0_rgba(16,38,71,0.1)]">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand-yellow mt-0.5">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-heading text-base sm:text-lg font-black text-brand-navy">
                  Вы перешли с интенсива «Инженерный вайбкодинг»
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-brand-charcoal/85 text-pretty">
                  Посмотрите открытый разбор и возвращайтесь на страницу курса, чтобы выбрать формат участия.
                </p>
              </div>
            </div>
            <Link
              href="/courses/vibecoding#pricing"
              className="btn-goose inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-sm font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-goose-red)]"
            >
              К тарифам курса
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      {lessons.length > 0 ? (
        <section className="space-y-10">
          <SectionHead
            title="Смотрите в любом порядке"
            accent="в любом порядке"
            note="Каждый урок закрывает одну конкретную проблему и работает сам по себе."
          />
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson, i) => (
              <li key={lesson.key}>
                <CoverCard
                  href={lessonPath(lesson.courseKey, lesson.number)}
                  title={lesson.title}
                  note={lesson.description}
                  imageUrl={localLessonPreview(lesson.courseKey, lesson.number) ?? lesson.previewImageUrl}
                  ratio="video"
                  bareCover
                  coverCaption={lesson.coverCaption}
                  meta={
                    lesson.durationSec
                      ? `${Math.max(1, Math.round(lesson.durationSec / 60))} мин · ${lesson.courseTitle}`
                      : lesson.courseTitle
                  }
                  index={i}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-muted-foreground">Бесплатные уроки скоро появятся.</p>
      )}

      {/* Баннер-переход к платному: бумажная текстура, рамка-рубашка гуся и он сам
          в углу — тот же приём, что у баннера главной, чтобы блок нельзя было
          пролистать взглядом. */}
      <section className="animate-rise relative">
        <div className="banner-goose-frame relative overflow-hidden rounded-3xl px-6 pt-9 pb-36 sm:px-12 sm:py-12">
          <Image
            src="/banner-home-goose.webp"
            alt=""
            width={760}
            height={619}
            aria-hidden
            className="pointer-events-none absolute right-0 bottom-0 w-[160px] select-none sm:w-[280px] lg:w-[360px]"
          />
          <div className="relative max-w-xl space-y-5">
            <StickerTag tone="navy">мы ждём тебя</StickerTag>
            <h2 className="font-heading text-[1.9rem]/[1.05] font-extrabold tracking-[-0.025em] text-balance text-brand-navy sm:text-[2.6rem]/[1.02]">
              Не только научим — <Accent>проверим</Accent> ваш результат
            </h2>
            <p className="max-w-lg text-base leading-snug font-medium text-brand-charcoal/80 text-pretty sm:text-lg">
              В&nbsp;обучениях эти кусочки складываются в&nbsp;рабочий процесс: правила проекта,
              проверки, свои агенты и&nbsp;деплой. Каждый шаг разбираем лично.
            </p>
            <div className="flex flex-col items-start gap-3 pt-2">
              <Link
                href="/courses"
                className="btn-goose inline-flex h-12 items-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
              >
                Посмотреть обучения
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href={TELEGRAM_DM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-navy/75 underline decoration-brand-navy/30 underline-offset-4 transition-colors hover:text-brand-navy"
              >
                <Send className="size-3.5" aria-hidden />
                Задать вопрос лично
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
