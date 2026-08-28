import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Send } from 'lucide-react';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { freeLessonCards } from '@/lib/catalog';
import { lessonPath } from '@/lib/slug';
import { plural } from '@/lib/utils';
import { TELEGRAM_DM } from '@/lib/site';
import { CoverCard } from '@/components/cover-card';
import { DoodleWord } from '@/components/doodle-decor';
import { SectionHead } from '@/components/section-head';

export const metadata: Metadata = {
  title: 'Бесплатные материалы — уроки про работу с ИИ | GELATO',
  description:
    'Открытые уроки школы GELATO: как объяснять задачу ИИ, куда уходят токены и лимиты, почему модель выдумывает ответы и как заставить её проверять себя.',
  alternates: { canonical: '/free' },
};

export default async function FreePage() {
  const courses = await getPublishedCoursesWithLessons();
  const lessons = freeLessonCards(courses);

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="animate-rise relative space-y-5 pt-4 sm:pt-8">
        <DoodleWord
          text="без оплаты"
          color="oklch(0.535 0.1893 28.3)"
          className="z-10 -top-1 right-2 text-xl -rotate-6 sm:text-2xl"
        />
        <p className="font-mono text-sm text-primary">
          Полезные материалы по работе с ИИ · {lessons.length} {plural(lessons.length, ['урок', 'урока', 'уроков'])}
        </p>
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          Бесплатные материалы
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Полноценные уроки, смотрите целиком и забирайте конспекты.
        </p>
      </section>

      {lessons.length > 0 ? (
        <section className="space-y-6">
          <SectionHead
            eyebrow="уроки"
            title="Смотрите в любом порядке"
            note="Каждый урок закрывает одну конкретную проблему и работает сам по себе."
          />
          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson, i) => (
              <li key={lesson.key}>
                <CoverCard
                  href={lessonPath(lesson.courseKey, lesson.number)}
                  title={lesson.title}
                  note={lesson.description}
                  imageUrl={lesson.previewImageUrl}
                  badge="Бесплатно"
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

      <section className="animate-rise relative">
        <div className="rounded-3xl border border-border bg-secondary/50 px-6 py-9 sm:px-10 sm:py-11">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div className="max-w-xl space-y-3">
              <p className="font-mono text-sm text-primary">$ дальше</p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Отдельные приёмы помогают один раз. Система — каждый день
              </h2>
              <p className="leading-relaxed text-muted-foreground text-pretty">
                В&nbsp;обучениях мы собираем из&nbsp;этих кусочков рабочий процесс: правила проекта,
                проверки, своих агентов и&nbsp;деплой.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/courses"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
              >
                Посмотреть обучения
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href={TELEGRAM_DM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
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
