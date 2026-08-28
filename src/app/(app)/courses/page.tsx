import type { Metadata } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { courseMeta, trainingCourses } from '@/lib/catalog';
import { getCourseLanding } from '@/lib/course-landings';
import { courseKey } from '@/lib/slug';
import { plural } from '@/lib/utils';
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
    <div className="space-y-16 sm:space-y-20">
      <section className="animate-rise space-y-5 pt-4 sm:pt-8">
        <p className="font-mono text-sm text-primary">
          $ обучения · {trainings.length} {plural(trainings.length, ['программа', 'программы', 'программ'])}
        </p>
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          Наши обучения
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Каждая программа — про одну задачу целиком: от первого касания до полноценного результата.
        </p>
      </section>

      <CourseQuizBanner />

      {trainings.length > 0 ? (
        <section className="space-y-6">
          <SectionHead
            eyebrow="программы"
            title="Все обучения"
            note="Внутри каждой страницы — для кого, что настроите, формат и стоимость."
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
