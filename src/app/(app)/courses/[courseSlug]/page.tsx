import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Minus, Send } from 'lucide-react';
import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { hasCourseAccess } from '@/lib/access';
import { buildFallbackLanding, getCourseLanding, type CourseLanding } from '@/lib/course-landings';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL, TELEGRAM_DM } from '@/lib/site';
import { DoodleWord, DoodleUnderline } from '@/components/doodle-decor';
import { SectionHead } from '@/components/section-head';
import { RichText } from '@/components/markdown';
import { Lemon } from '@/components/scene/lemon';

// Курс ищем по slug, но принимаем и id документа — со старых ссылок делаем редирект
async function findCourse(key: string): Promise<CourseWithLessons | null> {
  const courses = await getPublishedCoursesWithLessons();
  return courses.find((c) => courseKey(c) === key || c.id === key) ?? null;
}

function landingFor(course: CourseWithLessons): CourseLanding {
  return getCourseLanding(courseKey(course)) ?? buildFallbackLanding(course, course.lessons);
}

import { CourseBuyButton } from '@/components/payment/course-buy-button';
import { VibeTimerBadge } from '@/components/payment/vibe-timer-badge';
import { VibeComparisonSection } from '@/components/vibe-pipeline-visual';

// Оплативший приходит на лендинг за входом в уроки, а не за офером: продающие
// кнопки уступают место переходу к первому непройденному уроку.
type Continue = { href: string; label: string; hint: string };

// Главная кнопка лендинга: у оплатившего — внутренний переход к урокам,
// у остальных — быстрое открытие модалки оплаты.
function PrimaryCta({ cont, cta, courseSlug, courseTitle, className }: {
  cont: Continue | null;
  cta: CourseLanding['cta'];
  courseSlug: string;
  courseTitle: string;
  className: string;
}) {
  return cont ? (
    <Link href={cont.href} className={className}>
      {cont.label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  ) : (
    <CourseBuyButton
      courseSlug={courseSlug}
      courseTitle={courseTitle}
      label={cta.label}
      className={className}
    />
  );
}

export async function generateMetadata({ params }: {
  params: Promise<{ courseSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = await findCourse(courseSlug);
  if (!course) return {};
  const landing = landingFor(course);
  const canonical = `${SITE_URL}/courses/${courseKey(course)}`;
  return {
    title: landing.seoTitle,
    description: landing.seoDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: landing.seoTitle,
      description: landing.seoDescription,
      // без обложки в базе берём обложку лендинга, иначе превью в мессенджерах пустое
      images: [{ url: course.coverUrl || `${SITE_URL}${landing.cover || '/og-gelato.png'}`, alt: landing.h1 }],
    },
  };
}

export default async function CourseLandingPage({ params }: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await findCourse(courseSlug);
  if (!course) notFound();
  const key = courseKey(course);
  if (courseSlug !== key) permanentRedirect(`/courses/${key}`);
  const landing = landingFor(course);

  const session = await getSession();
  const [sub, completed] = await Promise.all([
    session ? getSubscription(session.uid) : null,
    session ? getCompletedLessonIds(session.uid) : new Set<string>(),
  ]);
  // у курса-пустышки (isTest) уроков нет — вести в них некуда даже с подпиской
  const owned =
    !course.isTest && course.lessons.length > 0 && hasCourseAccess(course.id, sub, Date.now());
  // первый непройденный урок; всё пройдено — возвращаем к началу курса
  const nextIndex = owned ? Math.max(0, course.lessons.findIndex((l) => !completed.has(l.id))) : 0;
  const doneCount = owned ? course.lessons.filter((l) => completed.has(l.id)).length : 0;
  const cont: Continue | null = owned
    ? {
        // в адрес идёт номер урока, в подсказку — его позиция среди видимых
        href: lessonPath(key, course.lessons[nextIndex].number),
        label: doneCount ? 'Продолжить обучение' : 'Начать обучение',
        hint: `Урок ${nextIndex + 1} из ${course.lessons.length}${doneCount ? ` · пройдено ${doneCount}` : ''}`,
      }
    : null;

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* Хиро: оффер, факты и обе кнопки — оплатить или написать лично */}
      <section className="animate-rise relative pt-6 sm:pt-10">
        {/* Обложка обучения стоит справа от текста: без неё правая половина
            первого экрана пустовала. */}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <h1 className="font-heading text-[2.6rem]/[1.04] font-bold tracking-[-0.03em] text-balance text-brand-navy sm:text-[3.4rem]/[1.02]">
              {landing.h1}
            </h1>
            <p className="mt-2.5 max-w-2xl text-lg leading-[1.35] text-muted-foreground text-pretty whitespace-pre-line sm:text-xl">
              <RichText text={landing.lead} />
            </p>

            {landing.offer && !cont && (
              <div className="mt-6 flex w-fit flex-col gap-2.5 rounded-2xl border-2 border-brand-navy/15 bg-brand-yellow p-4 sm:flex-row sm:items-center sm:gap-3.5">
                <span className="font-marker text-3xl leading-none text-brand-red shrink-0">{landing.offer.badge}</span>
                <div className="flex flex-col gap-1.5">
                  <span className="max-w-md text-sm leading-snug font-medium text-brand-charcoal/85 text-pretty whitespace-pre-line">
                    {landing.offer.text}
                  </span>
                  {(key === 'it-vibecoding' || key === 'vibecoding') && (
                    <VibeTimerBadge className="w-fit" />
                  )}
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryCta
                cont={cont}
                cta={landing.cta}
                courseSlug={key}
                courseTitle={course.title}
                className="btn-goose inline-flex h-12 items-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
              />
              <a
                href={TELEGRAM_DM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-navy/20 bg-card/60 px-6 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
              >
                <Send className="size-4" aria-hidden />
                Написать в личку
              </a>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">{cont?.hint ?? landing.cta.hint}</p>
          </div>

          {landing.cover && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-brand-navy/12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={landing.cover} alt="" aria-hidden className="block aspect-[4/3] w-full object-cover" />
            </div>
          )}
        </div>

        {landing.facts.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-10 sm:gap-4">
            {landing.facts.map((fact, idx) => (
              <div
                key={fact.label}
                className="group relative overflow-hidden rounded-xl border-2 border-brand-navy/15 bg-brand-cream/80 p-3 shadow-[0_2px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_4px_0_0_rgba(16,38,71,0.12)] sm:rounded-2xl sm:p-6 sm:shadow-[0_3px_0_0_rgba(16,38,71,0.06)] sm:hover:shadow-[0_5px_0_0_rgba(16,38,71,0.12)]"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-marker text-2xl leading-none text-brand-navy sm:text-5xl">{fact.value}</span>
                  <span className="hidden font-mono text-xs font-black text-brand-navy/35 sm:inline">0{idx + 1}</span>
                </div>
                <p className="mt-1.5 text-xs font-bold leading-tight text-brand-charcoal text-pretty sm:mt-3 sm:text-[15px] sm:leading-snug">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Блок об авторе (Второй блок страницы) */}
      <section className="animate-rise relative" id="about">
        <DoodleWord
          text="кто я"
          color="oklch(0.2705 0.0677 258.4)"
          className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
        />
        <div className="overflow-hidden rounded-3xl border-2 border-brand-navy/20 bg-card p-6 sm:p-10 shadow-[0_6px_0_0_rgba(16,38,71,0.08)]">
          <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[160px_1fr] sm:gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="relative size-28 sm:size-36 overflow-hidden rounded-2xl border-2 border-brand-navy/20 bg-brand-cream shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/scene/emil-avatar-collage-v2.webp"
                  alt="Эмиль, автор курса"
                  className="size-full object-cover object-top"
                />
              </div>
              <span className="mt-3 font-marker text-xl text-brand-navy">Эмиль</span>
              <span className="mt-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-brand-forest">
                Внедряю ИИ в прод
              </span>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://t.me/rrotatew"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-navy/20 bg-brand-cream/80 px-2.5 py-1 font-mono text-[11px] font-bold text-brand-navy hover:border-brand-navy/60 transition-colors"
                >
                  <Send className="size-3 text-brand-forest" />
                  Telegram
                </a>
                <a
                  href="https://www.linkedin.com/in/rrotatew"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-navy/20 bg-brand-cream/80 px-2.5 py-1 font-mono text-[11px] font-bold text-brand-navy hover:border-brand-navy/60 transition-colors"
                >
                  <ArrowUpRight className="size-3 text-brand-forest" />
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-forest/15 border border-brand-forest/25 px-2.5 py-1 font-mono text-xs font-black uppercase text-brand-forest">
                <span className="size-2 rounded-full bg-brand-forest animate-pulse" />
                Вы сможете избежать потерь
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-black text-brand-navy leading-tight">
                «Учу тому, чем <span className="relative inline-block whitespace-nowrap">пользуюсь сам<DoodleUnderline color="var(--color-goose-red)" className="w-full" /></span>»
              </h3>
              <div className="space-y-3 text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/85 text-pretty">
                <p>
                  <RichText text="Метод, которому учу, я **собрал сам на практике в крупных компаниях**. Каждый день работаю по нему и **делюсь ровно тем, чем пользуюсь**." />
                </p>
                <p>
                  <RichText text="Чужие гайды не пересказываю — **транслирую свой опыт**, построенный на **больших ошибках**, которые повлекли **потерю денег и времени**." />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Интерактивный блок сравнения «Одиночный чат vs Конвейер агентов» */}
      {(key === 'it-vibecoding' || key === 'vibecoding') && (
        <VibeComparisonSection />
      )}

      {/* Результаты */}
      {landing.results.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            title="Что будет на выходе"
            accent="на выходе"
            note="Конкретные осязаемые результаты, которые останутся работать в вашем проекте."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {landing.results.map((item, idx) => (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-navy/20 bg-card p-6 sm:p-8 shadow-[0_4px_0_0_rgba(16,38,71,0.08)] transition-all hover:-translate-y-1 hover:border-brand-navy hover:shadow-[0_8px_0_0_rgba(16,38,71,0.14)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 border-b-2 border-brand-navy/10 pb-4">
                    <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy leading-tight">
                      {item.title}
                    </h3>
                    <span className="font-marker text-3xl sm:text-4xl leading-none text-brand-forest shrink-0">
                      0{idx + 1}
                    </span>
                  </div>
                  <div className="mt-4 text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                    <RichText text={item.note} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Промежуточный сочный CTA после результатов */}
          {!cont && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-brand-navy/15 bg-brand-forest/10 p-5 sm:p-6">
              <div>
                <h4 className="font-heading text-lg font-extrabold text-brand-navy">
                  Хотите настроить такой конвейер на своём коде?
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-brand-charcoal/80 font-medium">
                  Старт потока 14 сентября · Первый чистый коммит уже в первый день · 3 дня гарантия 100%
                </p>
              </div>
              <PrimaryCta
                cont={cont}
                cta={{ label: 'Занять место на потоке', href: landing.cta.href, hint: '' }}
                courseSlug={key}
                courseTitle={course.title}
                className="btn-goose inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-sm font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-goose-red)]"
              />
            </div>
          )}
        </section>
      )}

      {/* Программа */}
      {landing.program.length > 0 && (
        <section className="animate-rise space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead
              title="Программа обучения"
              note="Пошаговая программа. Каждый модуль заканчивается практикой на вашем проекте."
            />
            <span className="font-mono text-xs font-bold text-brand-forest bg-brand-green/20 border border-brand-green/30 px-3 py-1 rounded-full">
              {landing.program.length} модулей · от старта к результату
            </span>
          </div>

          <div className="space-y-3">
            {landing.program.map((item, i) => (
              <div
                key={item.title}
                className="group flex items-start gap-4 rounded-2xl border-2 border-brand-navy/12 bg-card p-5 sm:gap-6 sm:p-6 shadow-xs transition-all hover:border-brand-navy hover:shadow-[0_4px_0_0_rgba(16,38,71,0.08)]"
              >
                <span className="font-marker text-3xl sm:text-5xl leading-none text-brand-forest shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                    {item.title}
                  </h3>
                  {item.note && (
                    <div className="mt-1.5 text-sm sm:text-base font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      <RichText text={item.note} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!cont && (
            <div className="flex justify-center pt-2">
              <PrimaryCta
                cont={cont}
                cta={{ label: 'Получить доступ к 17 урокам', href: landing.cta.href, hint: '' }}
                courseSlug={key}
                courseTitle={course.title}
                className="btn-goose inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy px-8 text-base font-extrabold text-brand-navy shadow-[0_4px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-goose-red)]"
              />
            </div>
          )}
        </section>
      )}

      {/* Кому подойдёт */}
      {landing.audience.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            title="Кому подойдёт"
            note="Хотя бы один пункт про вас — обучение точно решит вашу задачу."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {landing.audience.map((item, idx) => (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-7 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_6px_0_0_rgba(16,38,71,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-brand-navy/10 pb-3.5">
                    <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy">
                      {item.title}
                    </h3>
                    <span className="font-marker text-3xl leading-none text-brand-forest">
                      0{idx + 1}
                    </span>
                  </div>
                  <div className="mt-3.5 text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                    <RichText text={item.note} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!cont && (
            <div className="flex justify-center pt-2">
              <PrimaryCta
                cont={cont}
                cta={{ label: 'Занять место на потоке 14 сентября', href: landing.cta.href, hint: '' }}
                courseSlug={key}
                courseTitle={course.title}
                className="btn-scarf inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy px-8 text-base font-extrabold text-brand-navy shadow-[0_4px_0_0_var(--color-scarf-green)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-scarf-green)]"
              />
            </div>
          )}
        </section>
      )}

      {/* Почему мы */}
      {landing.why.length > 0 && (
        <section className="animate-rise relative space-y-8">
          <DoodleWord
            text="почему именно мы"
            color="oklch(0.535 0.1893 28.3)"
            className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
          />
          <SectionHead
            title="Чем это отличается от других курсов"
            accent="отличается"
            note="Здесь — практика и методы из реальноых проектов."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {landing.why.map((item, idx) => {
              if (idx === 0) {
                return (
                  <div
                    key={item.title}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-navy bg-[#FAF4EA] p-6 sm:p-8 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)]"
                  >
                    {/* Верхняя фирменная красно-белая полоска тента джелатерии */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(90deg,var(--color-goose-red)_0_16px,#FAF4EA_16px_32px)] border-b-2 border-brand-navy/20" />

                    <div className="pt-2">
                      <div className="flex items-start justify-between gap-4 border-b-2 border-brand-navy/15 pb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow/80 border-2 border-brand-navy/30 pl-1.5 pr-3 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-brand-navy shadow-2xs">
                              <Lemon className="size-4 shrink-0 -rotate-12" />
                              Gelato Метод
                            </span>
                            <span className="font-marker text-xs text-brand-red">★ главное отличие</span>
                          </div>
                          <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy leading-tight">
                            {item.title}
                          </h3>
                        </div>
                        <span className="font-marker text-4xl sm:text-5xl leading-none shrink-0 text-brand-navy">
                          01
                        </span>
                      </div>
                      <div className="mt-4 text-base sm:text-[17px] font-bold leading-relaxed text-brand-navy/90 text-pretty">
                        <RichText text={item.note} />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.title}
                  className="group relative flex flex-col justify-between rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-8 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_6px_0_0_rgba(16,38,71,0.12)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 border-b border-brand-navy/10 pb-4">
                      <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy leading-tight">
                        {item.title}
                      </h3>
                      <span className="font-marker text-3xl sm:text-4xl leading-none shrink-0 text-brand-forest">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="mt-4 text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      <RichText text={item.note} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Блок «Частые сомнения перед стартом» на месте прежнего формата */}
      {(key === 'it-vibecoding' || key === 'vibecoding') && (
        <section className="animate-rise relative space-y-8">
          <DoodleWord
            text="честно"
            color="oklch(0.535 0.1893 28.3)"
            className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
          />
          <SectionHead
            title="Частые сомнения перед стартом"
            accent="сомнения"
            note="Разбираем реальные технические вопросы, которые возникают при переходе на агентов."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-7 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy">
              <div>
                <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                  <span className="font-mono text-xs font-black uppercase text-brand-red">
                    сомнение 01
                  </span>
                  <span className="font-marker text-2xl text-brand-red">?</span>
                </div>
                <h4 className="mt-3 font-heading font-black text-xl text-brand-navy leading-snug">
                  «Сожгу лимиты и токены»
                </h4>
                <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed text-brand-charcoal/90">
                  <RichText text="**Наоборот.** Контекст живёт в `CLAUDE.md` и Skills, а не пересказывается в каждом чате. На второй неделе ты **тратишь меньше токенов**, чем в обычном чате." />
                </p>
              </div>
              <div className="mt-5 border-t border-dashed border-brand-navy/10 pt-3 text-xs font-bold text-brand-forest">
                ✓ Экономия токенов до 60%
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-7 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy">
              <div>
                <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                  <span className="font-mono text-xs font-black uppercase text-brand-red">
                    сомнение 02
                  </span>
                  <span className="font-marker text-2xl text-brand-red">?</span>
                </div>
                <h4 className="mt-3 font-heading font-black text-xl text-brand-navy leading-snug">
                  «Модели сменятся и всё устареет»
                </h4>
                <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed text-brand-charcoal/90">
                  <RichText text="**Конвейер не привязан к вендору.** Сегодня Claude Code, завтра Codex или DeepSeek. **Архитектура, тесты и правила проекта остаются твоими** навсегда." />
                </p>
              </div>
              <div className="mt-5 border-t border-dashed border-brand-navy/10 pt-3 text-xs font-bold text-brand-forest">
                ✓ Универсальный мультимодельный стек
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-7 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy">
              <div>
                <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                  <span className="font-mono text-xs font-black uppercase text-brand-red">
                    сомнение 03
                  </span>
                  <span className="font-marker text-2xl text-brand-red">?</span>
                </div>
                <h4 className="mt-3 font-heading font-black text-xl text-brand-navy leading-snug">
                  «Получится нечитаемый мусор»
                </h4>
                <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed text-brand-charcoal/90">
                  <RichText text="**ИИ пишет по строгим инженерным гайдам.** Агент соблюдает твою структуру папок, строгие типы и правила линтера. Код получается **чище и понятнее, чем у джуна**." />
                </p>
              </div>
              <div className="mt-5 border-t border-dashed border-brand-navy/10 pt-3 text-xs font-bold text-brand-forest">
                ✓ Чистая модульная архитектура
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Стоимость и финальный призыв */}
      <section className="animate-rise relative">
        <DoodleWord
          text="дальше просто"
          color="oklch(0.2705 0.0677 258.4)"
          className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
        />
        {/* Финальный CTA — бумажная текстура и рамка-тельняшка */}
        <div className="banner-marine-frame grid grid-cols-1 items-center gap-8 overflow-hidden rounded-3xl px-6 py-9 sm:px-10 sm:py-11 md:grid-cols-[1.25fr_0.75fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-[1.9rem]/[1.05] font-extrabold tracking-[-0.025em] text-balance text-brand-navy sm:text-[2.4rem]/[1.02]">
              {cont ? 'Доступ открыт' : landing.price.value}
            </h2>
            <div className="max-w-md leading-relaxed font-medium text-brand-charcoal/85 text-pretty">
              {cont ? (
                <p>
                  Обучение уже оплачено — {cont.hint.toLowerCase()}. Прогресс сохраняется, возвращайтесь в любой момент.
                </p>
              ) : (
                <RichText text="Выбирай **самостоятельный формат** или **продвинутый с личным разбором** твоего репозитория.\nСтарт **14 сентября**." />
              )}
            </div>
            {(key === 'it-vibecoding' || key === 'vibecoding') && !cont && (
              <VibeTimerBadge className="w-fit" />
            )}
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center">
              <PrimaryCta
                cont={cont}
                cta={landing.cta}
                courseSlug={key}
                courseTitle={course.title}
                className="btn-scarf inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-scarf-green)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-scarf-green)] motion-reduce:hover:translate-y-0"
              />
              <a
                href={TELEGRAM_DM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy/25 bg-brand-cream/80 px-6 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
              >
                <Send className="size-4" aria-hidden />
                Написать в личку
              </a>
            </div>
          </div>

          <div className="flex items-end justify-center md:justify-end">
            <Image
              src="/banner-lesson-dachshund.webp"
              alt=""
              width={660}
              height={809}
              aria-hidden
              className="pointer-events-none -mb-9 w-[180px] max-w-full select-none sm:w-[220px] md:-mb-11 md:w-[260px]"
            />
          </div>
        </div>
      </section>

      {/* Блок «Как проходит обучение» ниже баннера в стиле Вопрос-Ответ */}
      {landing.format.length > 0 && (
        <section className="animate-rise space-y-6 pt-4">
          <SectionHead
            title="Как проходит обучение: вопросы и ответы"
            accent="вопросы и ответы"
            note="Всё о процессе, домашках и поддержке после оплаты."
          />
          <div className="space-y-3">
            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>Как и когда открывается доступ к материалам?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-base font-medium leading-relaxed text-brand-charcoal/90">
                <RichText text="Все 17 уроков курса **открываются целиком со старта потока 14 сентября**. Вы двигаетесь в комфортном для себя темпе без искусственных задержек. **Доступ к курсу сохраняется на 2 месяца**." />
              </div>
            </details>

            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>На каких задачах мы будем практиковаться?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-base font-medium leading-relaxed text-brand-charcoal/90">
                <RichText text="Никаких оторванных от жизни примеров. **Каждое задание вы внедряете прямо в свой реальный проект или стартап**. Если проекта пока нет — выдадим готовый боевой шаблон." />
              </div>
            </details>

            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>Как устроена обратная связь и помощь автора?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-base font-medium leading-relaxed text-brand-charcoal/90">
                <RichText text="В тарифе с поддержкой вы получаете **3 недели закрытого чата с личным разбором от Эмиля**. Застряли на ошибке — присылаете код, получаем решение текстом или голосовым." />
              </div>
            </details>
          </div>

          {!cont && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <PrimaryCta
                cont={cont}
                cta={{ label: 'Выбрать тариф и начать', href: landing.cta.href, hint: '' }}
                courseSlug={key}
                courseTitle={course.title}
                className="btn-scarf inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy px-8 text-base font-extrabold text-brand-navy shadow-[0_4px_0_0_var(--color-scarf-green)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-scarf-green)]"
              />
              <a
                href="https://t.me/rrotatew"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy/20 bg-card px-6 font-mono text-sm font-bold text-brand-navy hover:border-brand-navy/60 transition-colors shadow-2xs"
              >
                <Send className="size-4 text-brand-forest" />
                Спросить автора в Telegram
              </a>
            </div>
          )}
        </section>
      )}

      <p className="text-sm text-muted-foreground pt-2">
        Остались вопросы?{' '}
        <Link href="/faq" className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
          Посмотрите полный FAQ
        </Link>{' '}
        — там подробно разобраны оплата и возврат. Или{' '}
        <Link href="/free" className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
          начните с&nbsp;бесплатных уроков
        </Link>
        .
      </p>
    </div>
  );
}
