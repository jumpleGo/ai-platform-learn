import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getSession } from '@/lib/session';
import { isLocked, isSubscriptionActive } from '@/lib/access';
import { youtubeId } from '@/lib/video-url';
import { plural } from '@/lib/utils';
import { courseKey } from '@/lib/slug';
import { CourseCarousel } from '@/components/course-carousel';
import { DoodleScatter, DoodleWord } from '@/components/doodle-decor';
import { PromoBanner, PromoStrip } from '@/components/promo-banner';
// SubscribeButton временно не используется — блок подписки скрыт

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

export default async function HomePage() {
  const session = await getSession();
  const [courses, sub] = await Promise.all([
    getPublishedCoursesWithLessons(),
    session ? getSubscription(session.uid) : null,
  ]);
  const now = Date.now();
  const totalLessons = courses.reduce((n, c) => n + c.lessons.length, 0);
  // маркетинговые баннеры — всем, у кого нет действующей подписки (включая гостей)
  const promo = !isSubscriptionActive(sub, now);
  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="animate-rise relative space-y-5 pt-4 sm:pt-8">
        <div className="bg-hero-glow pointer-events-none absolute inset-x-0 -top-24 h-80" aria-hidden />
        <DoodleScatter
          glyph="starburst"
          color="oklch(0.78 0.16 85)"
          className="top-0 right-1 h-7 w-7 -rotate-6 opacity-80 sm:h-9 sm:w-9 sm:right-2"
        />
        <DoodleScatter
          glyph="sparkleheart"
          color="oklch(0.68 0.19 12)"
          className="top-10 right-9 h-9 w-10 rotate-6 opacity-70 sm:top-14 sm:right-16 sm:h-11 sm:w-12"
        />
        <DoodleScatter
          glyph="cone"
          color="oklch(0.7 0.14 240)"
          className="top-20 right-0 h-8 w-7 -rotate-3 opacity-55 sm:top-24 sm:right-2 sm:h-10 sm:w-9"
        />
        <p className="relative font-mono text-sm text-primary">
          $ claude · {courses.length} {plural(courses.length, ['курс', 'курса', 'курсов'])} · {totalLessons}{' '}
          {plural(totalLessons, ['урок', 'урока', 'уроков'])}
        </p>
        <h1 className="relative max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          Научитесь работать с ИИ — кем бы вы ни были
        </h1>
        <p className="relative max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Практические видеокурсы: от первого промпта до уверенной работы с ИИ в своём деле.
        </p>

        {/* Лента ролей — показывает охват без перечисления в заголовке */}
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

      {promo && <PromoStrip />}

      {courses.map((course, i) => {
        // санитизация: в клиентскую карусель уходят только безопасные поля,
        // без videoEmbedUrl/materials; id ролика — лишь для доступных уроков
        const lockedIds = course.lessons.filter((l) => isLocked(l, sub, now)).map((l) => l.id);
        const cards = course.lessons.map((l) => ({
          id: l.id,
          courseId: l.courseId,
          courseKey: courseKey(course),
          title: l.title,
          durationSec: l.durationSec,
          views: l.views ?? 0,
          previewImageUrl: l.previewImageUrl,
          videoId: lockedIds.includes(l.id) ? null : youtubeId(l.videoEmbedUrl),
        }));
        return (
          <div key={course.id} className="animate-rise relative" style={{ '--rise-delay': `${0.08 * (i + 1)}s` } as React.CSSProperties}>
            {i === 0 && (
              <DoodleWord
                text="начни сейчас"
                color="oklch(0.68 0.19 12)"
                className="z-10 -top-3 left-0 text-lg -rotate-6 opacity-80 sm:-top-5 sm:text-xl"
              />
            )}
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
      {courses.length === 0 && (
        <p className="text-muted-foreground">Курсы скоро появятся.</p>
      )}

      {promo && <PromoBanner />}

      {/* Блок подписки временно скрыт
      <section id="subscribe" className="animate-rise scroll-mt-24" style={{ '--rise-delay': '0.2s' } as React.CSSProperties}>
        <div className="relative overflow-hidden rounded-3xl border border-accent-foreground/15 bg-accent px-6 py-10 sm:px-12 sm:py-12">
          <div className="bg-hero-glow pointer-events-none absolute -inset-x-10 -bottom-20 h-56 rotate-180 opacity-70" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div className="max-w-lg space-y-3">
              <div className="flex items-center gap-2 font-mono text-sm text-accent-foreground">
                <Sparkles className="size-4" aria-hidden />
                подписка
              </div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Полный доступ ко всем урокам
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Подписка открывает все платные уроки. Онлайн-оплата скоро появится —
                а пока подписку выдаёт администратор.
              </p>
            </div>
            <SubscribeButton place="home" />
          </div>
        </div>
      </section>
      */}
    </div>
  );
}
