import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, Minus, Send } from 'lucide-react';
import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { hasCourseAccess } from '@/lib/access';
import { buildFallbackLanding, getCourseLanding, type CourseLanding } from '@/lib/course-landings';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL, TELEGRAM_DM } from '@/lib/site';
import { DoodleWord } from '@/components/doodle-decor';
import { SectionHead } from '@/components/section-head';
import { RichText } from '@/components/markdown';

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
      images: course.coverUrl ? [{ url: course.coverUrl, alt: landing.h1 }] : undefined,
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
                  <span className="max-w-md text-sm leading-snug font-medium text-brand-charcoal/85 text-pretty">
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

      {/* Боли и запросы */}
      {landing.pains.length > 0 && (
        <section className="animate-rise relative">
          <DoodleWord
            text="знакомо?"
            color="oklch(0.535 0.1893 28.3)"
            className="z-10 -top-4 left-4 text-lg -rotate-6 sm:-top-5 sm:left-8 sm:text-xl"
          />
          <div className="rounded-3xl border-2 border-brand-navy/20 bg-brand-cream/50 p-6 sm:p-9 shadow-[0_4px_0_0_rgba(16,38,71,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-navy/10 pb-5">
              <SectionHead
                title="Что обычно идёт не так"
                accent="не так"
                note="Самые популярные тупики, на которых теряются недели и сливаются бюджеты."
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/10 px-3.5 py-1 font-mono text-xs font-bold text-brand-red">
                <span className="size-1.5 rounded-full bg-brand-red animate-pulse" />
                {landing.pains.length} типовых проблем
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {landing.pains.map((pain, idx) => (
                <div
                  key={pain}
                  className="flex items-start gap-3.5 rounded-xl border-2 border-brand-navy/10 bg-card p-4 shadow-2xs transition-colors hover:border-brand-navy/30"
                >
                  <span className="font-marker text-2xl leading-none text-brand-red shrink-0">
                    {idx + 1}.
                  </span>
                  <p className="text-[14px] sm:text-[15px] font-semibold leading-snug text-brand-charcoal text-pretty">
                    {pain}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Результаты */}
      {landing.results.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            title="Что будет на выходе"
            accent="на выходе"
            note="Конкретные осязаемые результаты, которые останутся работать в вашем проекте."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {landing.results.map((item, idx) => (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/70 p-6 shadow-[0_3px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_6px_0_0_rgba(16,38,71,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-brand-navy/10 pb-3">
                    <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-brand-forest">
                      // Результат {idx + 1}
                    </span>
                    <span className="font-marker text-3xl leading-none text-brand-forest">
                      {idx + 1}.
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-heading text-lg font-extrabold text-brand-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-brand-charcoal/85 text-pretty whitespace-pre-line">
                    {item.note}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 font-mono text-[11px] font-bold text-brand-forest">
                  <span>✓ Проверено на практике</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Программа */}
      {landing.program.length > 0 && (
        <section className="animate-rise space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead
              title="Что внутри"
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
                className="group flex flex-col gap-3 rounded-2xl border-2 border-brand-navy/12 bg-brand-cream/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 shadow-xs transition-all hover:border-brand-navy hover:shadow-[0_4px_0_0_rgba(16,38,71,0.08)]"
              >
                <div className="flex items-start gap-4 sm:items-center sm:gap-5">
                  <span className="font-marker text-4xl leading-none text-brand-navy shrink-0 group-hover:text-brand-forest transition-colors">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-heading text-base sm:text-lg font-extrabold text-brand-navy">
                      {item.title}
                    </h3>
                    {item.note && (
                      <p className="mt-1 text-sm font-medium leading-relaxed text-brand-charcoal/80 text-pretty">
                        <RichText text={item.note} /></p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 self-start sm:self-center">
                  <span className="inline-flex items-center rounded-lg border border-brand-forest/30 bg-brand-green/20 px-3 py-1 font-mono text-xs font-bold text-brand-forest group-hover:bg-brand-forest group-hover:text-brand-cream transition-colors">
                    Модуль {i + 1} →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Кому подойдёт */}
      {landing.audience.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            title="Кому подойдёт"
            note="Хотя бы один пункт про вас — обучение точно решит вашу задачу."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {landing.audience.map((item, idx) => (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/70 p-6 shadow-[0_3px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_5px_0_0_rgba(16,38,71,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-green/25 border border-brand-forest/20 px-2.5 py-0.5 font-mono text-xs font-extrabold text-brand-forest">
                      <span className="size-2 rounded-full bg-brand-forest" />
                      СЕГМЕНТ 0{idx + 1}
                    </span>
                    <span className="font-marker text-2xl leading-none text-brand-navy/50">
                      #{idx + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-lg font-extrabold text-brand-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-brand-charcoal/85 text-pretty">
                    {item.note}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 pt-3 border-t border-dashed border-brand-navy/10 text-xs font-bold text-brand-forest">
                  <span>✓ не нужно быть мега крутым. Разберемся со всем</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Почему мы */}
      {landing.why.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            title="Чем это отличается от других курсов"
            note="Здесь — практика и методы из реального продакшена, а не пересказ чужих гайдов."
            action={{ href: '/faq', label: 'Все возражения' }}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {landing.why.map((item, idx) => (
              <div
                key={item.title}
                className={`rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/80 p-6 shadow-[0_3px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy hover:shadow-[0_5px_0_0_rgba(16,38,71,0.12)] ${
                  idx === 0 ? 'md:col-span-2 border-brand-forest/40 bg-gradient-to-br from-brand-cream via-brand-cream to-brand-green/10' : ''
                }`}
              >
                <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                  <span className="font-mono text-xs font-black uppercase text-brand-forest">
                    {idx === 0 ? '★ Главное отличие' : `0${idx + 1} / ПРЕИМУЩЕСТВО`}
                  </span>
                  <span className="font-marker text-2xl leading-none text-brand-forest">
                    #{idx + 1}
                  </span>
                </div>
                <h3 className={`mt-3 font-heading font-extrabold text-brand-navy ${idx === 0 ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
                  {item.title}
                </h3>
                <p className={`mt-2 font-medium leading-relaxed text-brand-charcoal/85 text-pretty ${idx === 0 ? 'text-base max-w-2xl' : 'text-sm'}`}>
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Формат работы */}
      {landing.format.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            title="Как проходит обучение"
            note="Понятный предсказуемый процесс: от первого клика до работающей системы."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {landing.format.map((item, i) => (
              <div
                key={item.title}
                className="relative flex flex-col justify-between rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/70 p-6 shadow-[0_3px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-forest hover:shadow-[0_5px_0_0_rgba(16,38,71,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-marker text-3xl leading-none text-brand-forest">
                      {i + 1}.
                    </span>
                    <span className="font-mono text-xs font-bold text-brand-navy/40">ШАГ {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-heading text-base sm:text-lg font-extrabold text-brand-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-brand-charcoal/80 text-pretty">
                    {item.note}
                  </p>
                </div>
              </div>
            ))}
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
            <p className="max-w-md leading-relaxed font-medium text-brand-charcoal/80 text-pretty">
              {cont
                ? `Обучение уже оплачено — ${cont.hint.toLowerCase()}. Прогресс сохраняется, возвращайтесь в любой момент.`
                : landing.price.note}
            </p>
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

      <p className="text-sm text-muted-foreground">
        Остались вопросы?{' '}
        <Link href="/faq" className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
          Посмотрите вопрос-ответ
        </Link>{' '}
        — там разобраны вопросы, оплата и возврат. Или{' '}
        <Link href="/free" className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
          начните с&nbsp;бесплатных уроков
        </Link>
        .
      </p>
    </div>
  );
}
