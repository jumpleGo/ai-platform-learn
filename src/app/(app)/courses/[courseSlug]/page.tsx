import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, Send } from 'lucide-react';
import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getCompletedLessonIds } from '@/lib/db/progress';
import { getSession } from '@/lib/session';
import { hasCourseAccess } from '@/lib/access';
import { buildFallbackLanding, getCourseLanding, type CourseLanding } from '@/lib/course-landings';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL, TELEGRAM_DM } from '@/lib/site';
import { nbsp } from '@/lib/typography';
import { DoodleWord, DoodleUnderline } from '@/components/doodle-decor';
import { SectionHead } from '@/components/section-head';
import { RichText } from '@/components/markdown';
import { Lemon } from '@/components/scene/lemon';
import { CaseCycle } from '@/components/case-cycle';
import { BrandLogoRow, LogoStack } from '@/components/brand-logos';

// Курс ищем по slug, но принимаем и id документа — со старых ссылок делаем редирект
async function findCourse(key: string): Promise<CourseWithLessons | null> {
  const courses = await getPublishedCoursesWithLessons();
  return courses.find((c) => courseKey(c) === key || c.id === key) ?? null;
}

function landingFor(course: CourseWithLessons): CourseLanding {
  return getCourseLanding(courseKey(course)) ?? buildFallbackLanding(course, course.lessons);
}

import { CourseBuyButton } from '@/components/payment/course-buy-button';
import { TariffCards } from '@/components/payment/tariff-cards';
import { VibeComparisonSection } from '@/components/vibe-pipeline-visual';

// Оплативший приходит на лендинг за входом в уроки, а не за офером: продающие
// кнопки уступают место переходу к первому непройденному уроку.
type Continue = { href: string; label: string; hint: string };

// Главная кнопка лендинга: у оплатившего — внутренний переход к урокам,
// когда тарифы показаны на странице — якорь к ним (подпись «Выбрать тариф»
// совпадает с действием), иначе — открытие модалки оплаты.
function PrimaryCta({ cont, cta, courseSlug, courseTitle, className, pricingHref }: {
  cont: Continue | null;
  cta: CourseLanding['cta'];
  courseSlug: string;
  courseTitle: string;
  className: string;
  pricingHref?: string;
}) {
  if (cont) {
    return (
      <Link href={cont.href} className={className}>
        {cont.label}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    );
  }
  return pricingHref ? (
    <a href={pricingHref} className={className}>
      {cta.label}
      <ArrowDown className="size-4" aria-hidden />
    </a>
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
  const isVibe = key === 'it-vibecoding' || key === 'vibecoding';

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
  // Тарифы на странице пока только у вайбкодинга: у него две карточки и проверенные тексты
  const showTariffs = isVibe && !cont;
  // Все «Выбрать тариф» ведут к карточкам на странице, модалка остаётся для оплаты
  const pricingHref = showTariffs ? '#pricing' : undefined;

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* Хиро: оффер, факты и обе кнопки — оплатить или написать лично */}
      <section className="animate-rise relative pt-6 sm:pt-10">
        {/* Обложка обучения стоит справа от текста: без неё правая половина
            первого экрана пустовала. */}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <h1 className="font-heading text-[2.6rem]/[1.04] font-bold tracking-[-0.03em] text-balance text-brand-navy sm:text-[3.4rem]/[1.02]">
              {/* Слово «тимлида» подчёркиваем маркерной линией — как «пользуюсь сам» в блоке автора */}
              {landing.h1.includes('тимлида')
                ? landing.h1.split('тимлида').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="relative inline-block whitespace-nowrap">
                          тимлида
                           </span>
                      )}
                    </React.Fragment>
                  ))
                : landing.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.45] text-muted-foreground text-pretty whitespace-pre-line sm:mt-6 sm:text-xl">
              {isVibe ? (
                // Лёгкие ручные подчёркивания под двумя обещаниями — как «тимлида» в заголовке
                <>
                  За обучение{' '}
                  <span className="relative inline-block whitespace-nowrap text-brand-navy">
                    настроим твой репозиторий
                    <DoodleUnderline thin color="var(--color-scarf-green)" className="opacity-70" />
                  </span>{' '}
                  под ИИ: <strong className="font-black text-brand-navy"><br />CLAUDE.md, rules, skills, линтер, типы и тесты</strong>.
                  {'\n'}А также{' '}
                  <span className="relative inline-block whitespace-nowrap text-brand-navy">
                    покроем всё агентами
                    <DoodleUnderline thin color="var(--color-scarf-green)" className="opacity-70" />
                  </span>{' '}
                  и добавим оркестрацию.
                </>
              ) : (
                <RichText text={landing.lead} />
              )}
            </p>

            {landing.offer && !cont && (
              <div className="mt-6 flex w-fit flex-col gap-2.5 rounded-2xl border-2 border-brand-navy/15 bg-brand-yellow p-4 sm:flex-row sm:items-center sm:gap-3.5">
                <span className="font-marker text-3xl leading-none text-brand-red shrink-0">{landing.offer.badge}</span>
                {/* Таймер спеццены здесь не показываем: цены в хиро нет, отсчёт без неё давит,
                    а не помогает. Он стоит рядом с ценой в блоке форматов. */}
                <span className="max-w-md text-sm leading-snug font-medium text-brand-charcoal/85 text-pretty whitespace-pre-line">
                  {landing.offer.text}
                </span>
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3 sm:mt-10">
              <PrimaryCta
                cont={cont}
                cta={landing.cta}
                pricingHref={pricingHref}
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
            {(cont?.hint ?? landing.cta.hint) && (
              <p className="mt-2.5 text-xs text-muted-foreground">{cont?.hint ?? landing.cta.hint}</p>
            )}
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
        <div className="overflow-hidden rounded-3xl border-2 border-brand-navy/20 bg-card p-5 sm:p-8 shadow-[0_6px_0_0_rgba(16,38,71,0.08)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            {/* Аватар и контакты слева */}
            <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:text-center sm:w-40 shrink-0">
              <div className="relative size-28 sm:size-40 overflow-hidden rounded-2xl border-2 border-brand-navy/20 bg-brand-cream shadow-[0_3px_0_0_rgba(16,38,71,0.1)] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/scene/emil-avatar-collage-v2.webp"
                  alt="Эмиль, автор курса"
                  className="size-full object-cover object-top"
                />
              </div>
              <div className="flex flex-col sm:items-center">
                <span className="font-marker text-xl sm:text-2xl text-brand-navy leading-none">Эмиль</span>
                <span className="mt-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-brand-forest">
                  Внедряю ИИ в разработку
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  <a
                    href="https://t.me/rrotatew"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-brand-navy/20 bg-brand-cream/80 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-navy hover:border-brand-navy/60 transition-colors"
                  >
                    <Send className="size-2.5 text-brand-forest" />
                    TG
                  </a>
                  <a
                    href="https://www.linkedin.com/in/rrotatew"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-brand-navy/20 bg-brand-cream/80 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-navy hover:border-brand-navy/60 transition-colors"
                  >
                    <ArrowUpRight className="size-2.5 text-brand-forest" />
                    In
                  </a>
                </div>
              </div>
            </div>

            {/* Основной текст автора */}
            <div className="min-w-0 flex-1 space-y-3">
              <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-brand-navy leading-tight">
                «Учу тому, чем <span className="relative inline-block whitespace-nowrap">пользуюсь сам<DoodleUnderline color="var(--color-goose-red)" className="w-full" /></span>»
              </h3>
              <div className="space-y-2.5 text-lg sm:text-xl font-medium leading-relaxed text-brand-charcoal/85 text-pretty">
                {/* Тот же текст, что в сцене на главной (lib/scene.ts) — представление автора */}
                <p>
                  <RichText text="Я инженер с **8-летним опытом**, внедряю ИИ в большие проекты. Работал над проектами для **Сбербанка и Северстали**, руковожу командой как Team Lead. Эту школу я создал, чтобы дать вам простое и спокойное обучение на базе реальной инженерной практики." />
                </p>
                <p>
                  <RichText text="Метод, которому учу, я **собрал сам на практике в крупных компаниях**. Каждый день работаю по нему и **делюсь ровно тем, чем пользуюсь**." />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Блок сравнения «Проект без настройки vs Проект, настроенный под ИИ» */}
      {isVibe && (
        <VibeComparisonSection />
      )}

      {/* Один проверяемый цикл вместо голых цифр: схема-конвейер после контраста хаос/система,
          а не в хиро — на первом экране он перегружал взгляд */}
      {landing.caseStudy && (
        <section className="animate-rise">
          <CaseCycle data={landing.caseStudy} />
        </section>
      )}

      {/* Результаты */}
      {landing.results.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            size="lg"
            title="Что будет на выходе"
            accent="на выходе"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {landing.results.map((item, idx) => {
              const isKiller = item.title.toLowerCase().includes('автотест') || (idx === 2 && landing.results.length === 4);

              if (isKiller) {
                return (
                  <div key={item.title} className="relative">
                    {/* Кривенькая маркерная надпись «killer» над карточкой */}
                    <DoodleWord
                      text="killer"
                      color="#1B449C"
                      className="z-20 -top-4 right-6 text-xl -rotate-6 sm:-top-5 sm:right-8 sm:text-2xl"
                    />

                    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-navy bg-[#F0F5FC] p-6 sm:p-8 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)]">
                      {/* Верхняя фирменная сине-белая полоска (шезлонг / тельняшка) */}
                      <div
                        className="absolute top-0 left-0 right-0 h-3.5 border-b-2 border-brand-navy/25"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(90deg, #1B449C 0px, #1B449C 16px, #F0F5FC 16px, #F0F5FC 32px)',
                        }}
                      />

                      <div className="pt-2">
                        <div className="flex items-start justify-between gap-4 border-b-2 border-brand-navy/15 pb-4">
                          <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy leading-tight">
                            {item.title}
                          </h3>
                          <span className="font-marker text-3xl sm:text-4xl leading-none text-brand-navy shrink-0">
                            0{idx + 1}
                          </span>
                        </div>
                        <div className="mt-4 text-[17px] sm:text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty">
                          <RichText text={item.note} />
                        </div>
                        {/* В выделенной карточке логотипы не показываем: полоска сверху уже акцент */}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.title}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-8 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_6px_0_0_rgba(16,38,71,0.12)]"
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
                    <div className="mt-4 text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      <RichText text={item.note} />
                    </div>
                    {item.logos && (
                      <div className="mt-5 flex justify-end">
                        <LogoStack logos={item.logos} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Промежуточный сочный CTA после результатов */}
          {!cont && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-brand-navy/15 bg-brand-forest/10 p-5 sm:p-6">
              <div>
                <h4 className="font-heading text-lg font-extrabold text-brand-navy">
                  Хотите так настроить свой проект под ИИ?
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-brand-charcoal/80 font-medium">
                  Старт потока 14 сентября · Первый чистый коммит в первый день · Возврат 100% в первые 2 дня
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 sm:items-end">
                <PrimaryCta
                  cont={cont}
                  cta={{ label: landing.cta.label, href: landing.cta.href, hint: '' }}
                pricingHref={pricingHref}
                  courseSlug={key}
                  courseTitle={course.title}
                  className="btn-goose inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-sm font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-goose-red)]"
                />
                {/* Ранний бесплатный шаг: не только в футере */}
                <Link href="/free" className="text-xs font-bold text-brand-navy/70 underline underline-offset-4 hover:text-brand-navy">
                  Сначала посмотреть бесплатный урок
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Программа */}
      {landing.program.length > 0 && (
        <section className="animate-rise space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead
            size="lg"
              title="Программа обучения"
            />
            <span className="font-mono text-xs font-bold text-brand-forest bg-brand-green/20 border border-brand-green/30 px-3 py-1 rounded-full">
              {landing.program.length} модулей · от старта к результату
            </span>
          </div>

          {/* Условия участия рядом с программой: нагрузка, сроки, домашки, подписки */}
          {landing.terms && landing.terms.length > 0 && (
            <dl className="divide-y-2 divide-dashed divide-brand-navy/10 border-y-2 border-dashed border-brand-navy/10">
              {landing.terms.map((t) => (
                <div key={t.label} className="grid grid-cols-1 gap-x-8 gap-y-1 py-4 sm:grid-cols-[12rem_1fr] sm:items-baseline sm:py-5">
                  <dt className="font-mono text-xs font-black uppercase tracking-wider text-brand-navy/55 sm:text-sm">{t.label}</dt>
                  <dd className="font-heading text-xl font-black leading-snug text-brand-navy text-pretty sm:text-2xl">{t.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="space-y-3.5">
            {landing.program.map((item, i) => {
              const isOmg = item.title.toLowerCase().includes('память') || item.title.toLowerCase().includes('контекст, память');

              if (isOmg) {
                return (
                  <div key={item.title} className="relative">
                    {/* Кривенькая маркерная надпись «OMG!» над карточкой */}
                    <DoodleWord
                      text="OMG!"
                      color="#D4447E"
                      className="z-20 -top-4 right-6 text-xl -rotate-6 sm:-top-5 sm:right-8 sm:text-2xl"
                    />

                    <div className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border-2 border-brand-navy bg-[#FCEDF3] p-5 pt-6 sm:gap-6 sm:p-6 sm:pt-7 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)]">
                      {/* Верхняя фирменная розово-фиолетовая полоска с пляжного зонтика */}
                      <div
                        className="absolute top-0 left-0 right-0 h-3.5 border-b-2 border-brand-navy/25"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(90deg, #D4447E 0px, #D4447E 16px, #FCEDF3 16px, #FCEDF3 32px)',
                        }}
                      />

                      <span className="font-marker text-3xl sm:text-5xl leading-none text-brand-navy shrink-0 mt-0.5">
                        {i + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                          {item.title}
                        </h3>
                        {item.note && (
                          <div className="mt-2 text-[17px] sm:text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty">
                            <RichText text={item.note} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.title}
                  className="group flex items-start gap-4 rounded-2xl border-2 border-brand-navy/15 bg-card p-5 sm:gap-6 sm:p-6 shadow-xs transition-all hover:border-brand-navy hover:shadow-[0_4px_0_0_rgba(16,38,71,0.08)]"
                >
                  <span className="font-marker text-3xl sm:text-5xl leading-none text-brand-forest shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      {item.title}
                    </h3>
                    {item.note && (
                      <div className="mt-2 text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                        <RichText text={item.note} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!cont && (
            <div className="flex justify-center pt-2">
              <PrimaryCta
                cont={cont}
                cta={{ label: landing.cta.label, href: landing.cta.href, hint: '' }}
                pricingHref={pricingHref}
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
            size="lg"
            title="Кому подойдёт"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {landing.audience.map((item, idx) => {
              // Две выделенные карточки — вайбкодеры и разработчики — стоят рядом в первом ряду,
              // у каждой своя полоска и маркерная надпись
              const title = item.title.toLowerCase();
              const accent = title.includes('вайбкодер') || idx === 0
                ? { doodle: 'vibe', color: '#C2410C', bg: '#FFF1E8' }
                : title.includes('разработчик') || idx === 1
                  ? { doodle: 'JS, PHP', color: '#1F6E43', bg: '#EDF6F0' }
                  : null;

              if (accent) {
                return (
                  <div key={item.title} className="relative">
                    <DoodleWord
                      text={accent.doodle}
                      color={accent.color}
                      className="z-20 -top-4 right-6 text-xl -rotate-6 sm:-top-5 sm:right-8 sm:text-2xl"
                    />

                    <div
                      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-navy p-6 sm:p-7 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)]"
                      style={{ backgroundColor: accent.bg }}
                    >
                      {/* Верхняя фирменная полоска с пляжного зонтика в цвете карточки */}
                      <div
                        className="absolute top-0 left-0 right-0 h-3.5 border-b-2 border-brand-navy/25"
                        style={{
                          backgroundImage: `repeating-linear-gradient(90deg, ${accent.color} 0px, ${accent.color} 16px, ${accent.bg} 16px, ${accent.bg} 32px)`,
                        }}
                      />

                      <div className="pt-2">
                        <div className="flex items-center justify-between border-b-2 border-brand-navy/15 pb-3.5">
                          <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy">
                            {item.title}
                          </h3>
                          <span className="font-marker text-3xl leading-none text-brand-navy">
                            0{idx + 1}
                          </span>
                        </div>
                        <div className="mt-3.5 text-[17px] sm:text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty">
                          <RichText text={item.note} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
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
                    <div className="mt-3.5 text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      <RichText text={item.note} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!cont && (
            <div className="flex justify-center pt-2">
              <PrimaryCta
                cont={cont}
                cta={{ label: landing.cta.label, href: landing.cta.href, hint: '' }}
                pricingHref={pricingHref}
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
            size="lg"
            title="Чем это отличается от других курсов"
            accent="отличается"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {landing.why.map((item, idx) => {
              if (idx === 0) {
                return (
                  <div
                    key={item.title}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-navy bg-[#FFF6F2] p-6 sm:p-8 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)]"
                  >
                    {/* Верхняя фирменная красно-белая полоска тента джелатерии */}
                    <div
                      className="absolute top-0 left-0 right-0 h-3.5 border-b-2 border-brand-navy/25"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, #CE3D31 0px, #CE3D31 16px, #FFF6F2 16px, #FFF6F2 32px)',
                      }}
                    />

                    <div className="pt-3">
                      <div className="flex items-start justify-between gap-4 border-b-2 border-brand-navy/15 pb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow border-2 border-brand-navy/40 pl-2 pr-3 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-brand-navy shadow-2xs">
                              <Lemon className="size-4 shrink-0 -rotate-12" />
                              Gelato Метод
                            </span>
                          </div>
                          <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy leading-tight">
                            {item.title}
                          </h3>
                        </div>
                        <span className="font-marker text-4xl sm:text-5xl leading-none shrink-0 text-brand-navy">
                          01
                        </span>
                      </div>
                      <div className="mt-4 text-[17px] sm:text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty">
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
                    <div className="mt-4 text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      <RichText text={item.note} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Форматы участия: тарифы с ценой и составом прямо на странице.
          У оплатившего — баннер с переходом к урокам. */}
      <section id="pricing" className="animate-rise relative scroll-mt-24 space-y-8">
        <DoodleWord
          text="дальше просто"
          color="oklch(0.2705 0.0677 258.4)"
          className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
        />
        {showTariffs && (
          <>
            <SectionHead
            size="lg"
              title={landing.price.value}
              note={landing.price.note}
            />
            <TariffCards
              courseSlug={key}
              courseTitle={course.title}
              footnote={nbsp('\n')}
            />
          </>
        )}
        {/* Бумажная текстура и рамка-тельняшка. С тарифами выше — «не знаешь, какой формат»,
            без них — прежний оффер с кнопкой, у оплатившего — вход в уроки */}
        <div className="banner-marine-frame grid grid-cols-1 items-center gap-8 overflow-hidden rounded-3xl px-6 py-9 sm:px-10 sm:py-11 md:grid-cols-[1.25fr_0.75fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-[1.9rem]/[1.05] font-extrabold tracking-[-0.025em] text-balance text-brand-navy sm:text-[2.4rem]/[1.02]">
              {cont ? 'Доступ открыт' : showTariffs ? 'Не знаешь, какой формат твой?' : landing.price.value}
            </h2>
            <div className="max-w-md leading-relaxed font-medium text-brand-charcoal/85 text-pretty">
              {cont ? (
                <p>
                  Обучение уже оплачено — {cont.hint.toLowerCase()}. Прогресс сохраняется, возвращайтесь в любой момент.
                </p>
              ) : showTariffs ? (
                <RichText text="Напиши пару слов о проекте и стеке — **подскажу, хватит ли самостоятельного формата** или нужна поддержка. Или начни с бесплатного урока." />
              ) : (
                <RichText text={landing.price.note} />
              )}
            </div>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center">
              {showTariffs ? (
                <>
                  <a
                    href={TELEGRAM_DM}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-scarf inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-scarf-green)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-scarf-green)] motion-reduce:hover:translate-y-0"
                  >
                    <Send className="size-4" aria-hidden />
                    Написать в личку
                  </a>
                  <Link
                    href="/free"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy/25 bg-brand-cream/80 px-6 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
                  >
                    Бесплатный урок
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </>
              ) : (
                <>
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
                </>
              )}
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

      {/* Блок «Частые сомнения перед стартом» на месте прежнего формата */}
      {isVibe && (
        <section className="animate-rise relative space-y-8">
          <DoodleWord
            text="честно"
            color="oklch(0.535 0.1893 28.3)"
            className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
          />
          <SectionHead
            size="lg"
            title="Частые сомнения перед стартом"
            accent="сомнения"
           
          />
                    {/* Три карточки в subgrid: шапки, заголовки, тексты и подписи стоят на одних линиях,
              даже если текст разной длины. Внутри карточки — только прямые дети, без обёрток. */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-[auto_auto_auto_auto]">
            <div className="flex flex-col rounded-3xl border-2 border-brand-navy/15 bg-card p-6 pt-8 sm:p-7 sm:pt-9 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy md:grid md:grid-rows-subgrid md:row-span-4">
              <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                <span className="font-mono text-xs font-black uppercase text-brand-red">сомнение 01</span>
                <span className="font-marker text-2xl text-brand-red">?</span>
              </div>
              <h4 className="pt-3 font-heading font-black text-xl text-brand-navy leading-snug">«Сожгу лимиты и токены»</h4>
              <p className="pt-3 text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90">
                <RichText text="**Наоборот.** Контекст живёт в `CLAUDE.md` и Skills, а не пересказывается в каждом чате: **модель читает правила из файлов**. Пересказ стека и архитектуры из каждого диалога уходит." />
              </p>
              <div className="mt-auto w-full self-end border-t border-dashed border-brand-navy/10 pt-3 text-xs sm:text-sm font-bold text-brand-forest">
                Контекст в файлах
              </div>
            </div>

            {/* Полоска сверху скруглена сама, чтобы карточке не нужен был overflow-hidden — иначе он срезал бы надпись-дудл */}
            <div className="group relative flex flex-col rounded-3xl border-2 border-brand-navy bg-[#F0F5FC] p-6 pt-8 sm:p-7 sm:pt-9 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)] md:grid md:grid-rows-subgrid md:row-span-4">
              <DoodleWord
                text="DeepSeek, GPT, Claude"
                color="#1B449C"
                className="z-20 -top-4 right-4 text-base -rotate-6 sm:-top-5 sm:right-6 sm:text-xl whitespace-nowrap"
              />
              <div
                className="absolute top-0 left-0 right-0 h-3.5 rounded-t-[calc(1.5rem-2px)] border-b-2 border-brand-navy/25"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, #1B449C 0px, #1B449C 16px, #F0F5FC 16px, #F0F5FC 32px)',
                }}
                aria-hidden
              />
              <div className="flex items-center justify-between border-b-2 border-brand-navy/15 pb-3">
                <span className="font-mono text-xs font-black uppercase text-brand-red">сомнение 02</span>
                <span className="font-marker text-2xl text-brand-red">?</span>
              </div>
              <h4 className="pt-3 font-heading font-black text-xl text-brand-navy leading-snug">«Модели сменятся и всё устареет»</h4>
              <p className="pt-3 text-[17px] sm:text-lg font-bold leading-relaxed text-brand-navy/90">
                <RichText text="**Настройка не привязана к вендору.** Сегодня Claude Code, завтра Codex или DeepSeek." />
              </p>
              <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 self-end border-t border-dashed border-brand-navy/20 pt-3 text-xs sm:text-sm font-black text-brand-navy">
                <span>Универсальный мультимодельный стек</span>
                <BrandLogoRow logos={['claude', 'codex', 'kimi', 'deepseek', 'gemini']} size="sm" />
              </div>
            </div>

            <div className="flex flex-col rounded-3xl border-2 border-brand-navy/15 bg-card p-6 pt-8 sm:p-7 sm:pt-9 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy md:grid md:grid-rows-subgrid md:row-span-4">
              <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
                <span className="font-mono text-xs font-black uppercase text-brand-red">сомнение 03</span>
                <span className="font-marker text-2xl text-brand-red">?</span>
              </div>
              <h4 className="pt-3 font-heading font-black text-xl text-brand-navy leading-snug">«Получится нечитаемый мусор»</h4>
              <p className="pt-3 text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90">
                <RichText text="**ИИ пишет по правилам проекта.** Структура папок, строгие типы и линтер заданы в конфиге. Код **проходит линтер, типы и тесты до того, как ты его увидишь**." />
              </p>
              <div className="mt-auto w-full self-end border-t border-dashed border-brand-navy/10 pt-3 text-xs sm:text-sm font-bold text-brand-forest">
                Зелёный статус проверок до ревью
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Блок «Как проходит обучение» ниже баннера в стиле Вопрос-Ответ */}
      {landing.format.length > 0 && (
        <section className="animate-rise space-y-6 pt-4">
          <SectionHead
            size="lg"
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
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90">
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
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90">
                <RichText text="**На учебном репозитории** — своём тестовом проекте или выданном шаблоне. Первые 3 недели набиваете руку и ошибки без риска для рабочего кода, а потом переносите настройку в свои процессы по правилам своей компании. **Хотите сразу внедрять в рабочий проект — можно**, программа это не запрещает. Моделям уходят только файлы учебного репозитория, которые читает агент." />
              </div>
            </details>

            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>Как устроена обратная связь и помощь автора?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90">
                <RichText text="В тарифе с поддержкой вы получаете **3 недели закрытого чата с личным разбором от Эмиля**. Застряли на ошибке — присылаете код, получаете решение текстом или голосовым. **Автор видит только то, что вы сами прислали в чат**: фрагменты кода, диффы, скриншоты. Доступ к вашему репозиторию не нужен." />
              </div>
            </details>
          </div>

          {!cont && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <PrimaryCta
                cont={cont}
                cta={{ label: landing.cta.label, href: landing.cta.href, hint: '' }}
                pricingHref={pricingHref}
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
