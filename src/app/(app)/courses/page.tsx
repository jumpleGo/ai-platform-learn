import type { Metadata } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { courseMeta, trainingCourses } from '@/lib/catalog';
import { getCourseLanding } from '@/lib/course-landings';
import { courseKey } from '@/lib/slug';
import { TitleAccent } from '@/components/accent';
import { CoverCard } from '@/components/cover-card';
import { CourseQuizBanner } from '@/components/course-quiz';
import { SectionHead } from '@/components/section-head';

export const metadata: Metadata = {
  title: 'Наши обучения — программы школы GELATO',
  description:
    'Обучения GELATO: Claude Code и свои агенты, вайбкодинг с инженерским подходом, ИИ-мультфильмы. Пройдите тест и узнайте, какая программа подойдёт именно вам.',
  alternates: { canonical: '/courses' },
};

export default async function CoursesPage() {
  const courses = await getPublishedCoursesWithLessons();
  const trainings = trainingCourses(courses);

  return (
    <div className="space-y-20 sm:space-y-24">
      <section className="animate-rise pt-6 sm:pt-10">
        <h1 className="font-heading text-[clamp(2.6rem,7vw,5.25rem)]/[0.98] font-bold tracking-[-0.035em] text-balance text-brand-navy">
          Наши <TitleAccent>обучения</TitleAccent>
        </h1>
        <p className="mt-2.5 max-w-2xl text-lg leading-[1.35] text-muted-foreground text-pretty sm:text-xl">
          Актуальные программы на сегодняшний день. Каждая, включает в себя домашки, разборы и максимальную отдачу нашего преподавателя.
        </p>
      </section>

      <CourseQuizBanner />

      {trainings.length > 0 ? (
        <section className="space-y-10">
          <SectionHead
            title="Все обучения"
            note="Кликните, чтобы узнать - для кого, что настроите, формат и стоимость."
          />
          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {trainings.map((course, i) => {
              const key = courseKey(course);
              const landing = getCourseLanding(key);
              return (
                <li key={course.id}>
                  <CoverCard
                    href={`/courses/${key}`}
                    title={landing?.h1 ?? course.title}
                    kicker={course.title}
                    note={landing?.lead ?? course.description}
                    imageUrl={landing?.cover ?? course.coverUrl}
                    badge={course.isTest ? 'Скоро' : null}
                    meta={courseMeta(course)}
                    index={i}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="text-muted-foreground">Обучения скоро появятся.</p>
      )}
    </div>
  );
}
