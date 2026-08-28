import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getSession } from '@/lib/session';
import { isLocked, isSubscriptionActive } from '@/lib/access';
import { youtubeId } from '@/lib/video-url';
import { plural } from '@/lib/utils';
import { courseKey, lessonPath } from '@/lib/slug';
import { courseMeta, freeLessonCards, trainingCourses } from '@/lib/catalog';
import { getCourseLanding } from '@/lib/course-landings';
import { CourseCarousel } from '@/components/course-carousel';
import { CoverCard } from '@/components/cover-card';
import { HomeVariantAnalytics } from '@/components/home-variant-analytics';
import { DoodleWord } from '@/components/doodle-decor';
import { PromoBanner } from '@/components/promo-banner';
import { SectionHead } from '@/components/section-head';
import { nbspDeep } from '@/lib/typography';

// Лента ролей в хиро — показывает охват, не перечисляя всех в заголовке
const AUDIENCE = [
  'СММ-щикам',
  'Маркетологам',
  'Родителям',
  'Школьникам',
  'Лесникам',
  'Дизайнерам',
  'Проектировщикам',
  'Предпринимателям',
  'Врачам',
  'Юристам',
  'Разработчикам',
];

// Блок «о нас»: чем школа отличается от платформы-конвейера
const ABOUT = nbspDeep([
  {
    title: 'Учит практик',
    note: 'Преподаватель с опытом 8 лет в инженерстве. Уроки записывает тот, кто сам строит большие системы.',
  },
  {
    title: 'Актуальные программы',
    note: 'Уроки обновляются под изменения рынка.\nВы всегда получаете самую акутальную информацию.',
  },
  {
    title: 'Работаем лично',
    note: 'Застряли — пишете в чат и получаете ответ от автора. Все просто.',
  },
  {
    title: 'На выходе — ВАШ проект',
    note: 'Работающий проект, который ВЫ сами придумали - с правилами, проверками и своими агентами.',
  },
]);

// Блок «о тебе»: боли, по которым читатель узнаёт себя
const PAINS = nbspDeep([
  'Пробовали ИИ, но все равно ничего непонятно.',
  'Объясняете задачу, получаете не то — и переделываете по кругу, сжигая лимиты.',
  'В каждом новом чате приходится заново рассказывать про свой проект.',
  'ИИ правит одно и ломает другое.',
  'Слов много — скиллы, агенты, MCP, — а как это складывается в работу, никто не показал.',
  'Проект живёт на ноутбуке, потому что выложить его в интернет — отдельный страх.',
]);

// «Для кого»: кликабельные плашки — каждый уходит туда, где узнаёт себя
const FOR_WHOM: { label: string; href: string }[] = [
  { label: 'Не программист', href: '/courses/claude-code-agents' },
  { label: 'Вайбкодер с живым проектом', href: '/courses/vibecoding' },
  { label: 'Разработчик в команде', href: '/courses/vibecoding' },
  { label: 'Маркетолог', href: '/courses/ai-cartoons' },
  { label: 'Дизайнер', href: '/courses/ai-cartoons' },
  { label: 'Родитель', href: '/courses/ai-cartoons' },
  { label: 'Предприниматель', href: '/courses/claude-code-agents' },
  { label: 'Пока только присматриваюсь', href: '/free' },
];

export default async function HomePage() {
  const session = await getSession();
  const [courses, sub] = await Promise.all([
    getPublishedCoursesWithLessons(),
    session ? getSubscription(session.uid) : null,
  ]);
  const now = Date.now();
  const trainings = trainingCourses(courses);
  const freeLessons = freeLessonCards(courses);
  // маркетинговые баннеры — всем, у кого нет действующей подписки (включая гостей)
  const promo = !isSubscriptionActive(sub, now);

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* A/B меряем на гостях: вошедшему сцена не показывается вовсе (см. proxy),
          и его показы перекосили бы бакет classic */}
      {!session && <HomeVariantAnalytics variant="classic" />}
      <section className="animate-rise relative space-y-5 pt-4 sm:pt-8">
        <p className="relative font-mono text-sm text-primary">
          $ claude · {trainings.length} {plural(trainings.length, ['обучение', 'обучения', 'обучений'])} ·{' '}
          {freeLessons.length} {plural(freeLessons.length, ['бесплатный урок', 'бесплатных урока', 'бесплатных уроков'])}
        </p>
        <h1 className="relative max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          Научитесь работать с&nbsp;ИИ — кем&nbsp;бы вы ни&nbsp;были
        </h1>
        <p className="relative max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Практика, практика и еще раз практика.<br />Актуальные программы, поддержка и обучение на проектах, которые интересны Вам.
        </p>
        <div className="relative flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/courses"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            Обучения
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/free"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card/60 px-6 text-[15px] font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Сначала бесплатно
          </Link>
        </div>

        <div className="relative overflow-hidden pt-1">
          <ul className="animate-roles flex">
            {[...AUDIENCE, ...AUDIENCE].map((role, i) => (
              <li
                key={i}
                aria-hidden={i >= AUDIENCE.length}
                className="mr-2.5 mb-2.5 shrink-0 rounded-full border border-border bg-card/60 px-3.5 py-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground motion-reduce:[&[aria-hidden=true]]:hidden"
              >
                {role}
              </li>
            ))}
          </ul>
          {/* Шторки цветом фона — лента растворяется в фон без белёсой каймы */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent motion-reduce:hidden" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent motion-reduce:hidden" aria-hidden />
        </div>
      </section>

      {/* Учебная витрина — только своим: гостю она конкурирует с офферами и путает.
          id — цель пункта шапки «Моё обучение» (lib/site.ts) */}
      {session && courses.length > 0 && (
        <section id="learning" className="scroll-mt-24 space-y-12 sm:space-y-16">
          <SectionHead
            eyebrow="ваше обучение"
            title="Продолжить с того места, где остановились"
            note="Все уроки курсов, к которым у вас открыт доступ."
          />
          {courses.map((course, i) => {
            // санитизация: в клиентскую карусель уходят только безопасные поля,
            // без videoEmbedUrl/materials; id ролика — лишь для доступных уроков
            const lockedIds = course.lessons.filter((l) => isLocked(l, sub, now)).map((l) => l.id);
            const cards = course.lessons.map((l) => ({
              id: l.id,
              courseId: l.courseId,
              courseKey: courseKey(course),
              number: l.number,
              title: l.title,
              durationSec: l.durationSec,
              views: l.views ?? 0,
              previewImageUrl: l.previewImageUrl,
              videoId: lockedIds.includes(l.id) ? null : youtubeId(l.videoEmbedUrl),
            }));
            return (
              <div
                key={course.id}
                className="animate-rise relative"
                style={{ '--rise-delay': `${0.08 * (i + 1)}s` } as React.CSSProperties}
              >
                <CourseCarousel
                  course={{
                    title: course.title,
                    description: course.description,
                    isTest: course.isTest ?? false,
                    testToastMessage: course.testToastMessage ?? null,
                    showBadge: course.showBadge ?? false,
                    badgeText: course.badgeText ?? null,
                    highlightBackground: course.highlightBackground ?? false,
                  }}
                  lessons={cards}
                  lockedIds={lockedIds}
                />
              </div>
            );
          })}
        </section>
      )}

      {/* О нас */}
      <section id="about" className="animate-rise scroll-mt-24 space-y-8">
        <SectionHead
          eyebrow="GELATO"
          title="Маленькая школа ИИ"
          note="Долой учебные проекты! Наша цель обучить вас на вашем же проекте."
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ABOUT.map((item, i) => (
            <li
              key={item.title}
              className="animate-float rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
              style={{ '--rise-delay': `${i * 0.06}s` } as React.CSSProperties}
            >
              <p className="font-heading text-lg font-semibold tracking-tight">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty whitespace-pre-line">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* О тебе */}
      <section className="animate-rise relative">
        <DoodleWord
          text="узнаёте себя?"
          color="oklch(0.535 0.1893 28.3)"
          className="z-10 -top-4 left-4 text-lg -rotate-6 sm:-top-5 sm:left-8 sm:text-xl"
        />
        <div className="rounded-3xl border-2 border-dashed border-primary/25 bg-brand-yellow/60 px-6 py-9 sm:px-10 sm:py-11">
          <SectionHead
            eyebrow="о вас"
            title="Скорее всего, вы уже пробовали"
            note="И упёрлись не в интеллект модели, а в отсутствие процесса."
          />
          <ul className="mt-7 grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {PAINS.map((pain) => (
              <li key={pain} className="flex gap-3 text-[15px] leading-snug text-pretty">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-navy/12 text-brand-navy">
                  <Check className="size-3" aria-hidden />
                </span>
                {pain}
              </li>
            ))}
          </ul>
          <p className="mt-7 text-sm text-brand-charcoal/70">
            Хотя&nbsp;бы один пункт про вас — значит, вы по&nbsp;адресу.
          </p>
        </div>
      </section>

      {/* Для кого — кликабельные плашки, каждая уводит в свой раздел */}
      <section className="animate-rise space-y-6">
        <SectionHead
          eyebrow="для кого"
          title="Выберите то, что про вас"
          note="Нажмите на свою роль — покажем, с чего начинать именно вам."
        />
        <ul className="flex flex-wrap gap-2.5">
          {FOR_WHOM.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary motion-reduce:hover:translate-y-0"
              >
                {item.label}
                <ArrowUpRight
                  className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Наши обучения */}
      {trainings.length > 0 && (
        <section className="animate-rise space-y-6">
          <SectionHead
            eyebrow="наши обучения"
            title="Программы"
            note="Три направления. Не уверены, какое ваше — на витрине есть тест на четыре вопроса."
            action={{ href: '/courses', label: 'Все обучения' }}
          />
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {trainings.slice(0, 3).map((course, i) => {
              const key = courseKey(course);
              const landing = getCourseLanding(key);
              return (
                <li key={course.id}>
                  <CoverCard
                    href={`/courses/${key}`}
                    title={landing?.h1 ?? course.title}
                    kicker={course.title}
                    note={course.description}
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
      )}

      {/* Бесплатные материалы */}
      {freeLessons.length > 0 && (
        <section className="animate-rise space-y-6">
          <SectionHead
            eyebrow="бесплатно"
            title="Начните с бесплатных уроков"
            note="Настоящие уроки. Посмотрите, как мы объясняем, прежде чем платить."
            action={{ href: '/free', label: 'Все материалы' }}
          />
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {freeLessons.slice(0, 3).map((lesson, i) => (
              <li key={lesson.key}>
                <CoverCard
                  href={lessonPath(lesson.courseKey, lesson.number)}
                  title={lesson.title}
                  kicker={`Урок ${String(lesson.number).padStart(2, '0')}`}
                  note={lesson.description}
                  imageUrl={lesson.previewImageUrl}
                  badge="Бесплатно"
                  ratio="video"
                  bareCover
                  index={i + 2}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {promo && <PromoBanner />}
    </div>
  );
}
