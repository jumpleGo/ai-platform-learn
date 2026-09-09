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
import { BrandLogoRow, LogoStack, BrandLogo } from '@/components/brand-logos';

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
    twitter: {
      card: 'summary_large_image',
      title: landing.seoTitle,
      description: landing.seoDescription,
      images: [course.coverUrl || `${SITE_URL}${landing.cover || '/og-gelato.png'}`],
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
  const isAgents = key === 'claude-code-agents';

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
  // Для продаваемых флагманских программ цена и состав должны быть видны до модалки.
  const showTariffs = (isVibe || isAgents) && !cont;
  // Все «Выбрать тариф» ведут к карточкам на странице, модалка остаётся для оплаты
  const pricingHref = showTariffs ? '#pricing' : undefined;
  const faqItems = isAgents
    ? [
        {
          question: 'Что именно входит в курс?',
          answer: '**Введение и 8 практических уроков.** Сначала установим Claude Code и выполним первую задачу. Затем научим его помнить правила вашего проекта, подключим нужные инструменты, создадим сайт и собственных агентов. После каждого урока есть понятное практическое задание.',
        },
        {
          question: 'Получится ли без опыта программирования?',
          answer: '**Да, стартуем с установки и терминала.** Код и файлы создаёт Claude Code по вашим заданиям обычными словами. При этом вы научитесь ориентироваться в папках проекта и проверять результат — полностью игнорировать техническую часть не получится.',
        },
        {
          question: 'Нужен ли готовый проект?',
          answer: '**Нет.** Можно прийти с идеей, повторяющейся рабочей задачей или начать с простой HTML-страницы прямо на курсе. Если проект уже есть, вы сможете настроить для него контекст, правила, команды и агентов.',
        },
        {
          question: 'Что я сделаю руками во время обучения?',
          answer: 'Вы настроите помощника, который пишет в вашем стиле, **создадите свой сайт и опубликуете его в интернете — ссылку сможет открыть любой человек**. Затем подключите к Claude внешний сервис и соберёте отдельных агентов под свои повторяющиеся задачи.',
        },
        {
          question: 'Как устроена поддержка?',
          answer: 'В зависимости от тарифа вы получаете **3 или 4 недели личной поддержки**. Можно прислать вопрос, скриншот или запись экрана: автор поможет найти причину ошибки и поправить настройку. В самостоятельном тарифе поддержки нет.',
        },
        {
          question: 'Какие дополнительные расходы понадобятся?',
          answer: 'Для практики нужен Claude Code. **В тарифах с поддержкой месяц Claude Pro идёт в подарок.** Если вы захотите подключить дополнительный платный сервис, его подписка оплачивается отдельно; для прохождения базовой программы выбирать такой сервис не обязательно.',
        },
      ]
    : [
        {
          question: 'Как и когда открывается доступ к материалам?',
          answer: 'Все 17 уроков курса **открываются целиком со старта потока 14 сентября**. Вы двигаетесь в комфортном для себя темпе. **Доступ к курсу сохраняется на 2 месяца**.',
        },
        {
          question: 'Подойдёт ли курс, если у меня другой стек или закрытый код?',
          answer: '**Стек не имеет значения.** Правила репозитория, `CLAUDE.md` и изоляция изменений работают с разными языками. Закрытый рабочий код показывать не нужно: задания можно проходить на отдельном репозитории или пет-проекте.',
        },
        {
          question: 'Как устроена обратная связь и помощь автора?',
          answer: 'В тарифе с поддержкой вы получаете **3 недели закрытого чата с личным разбором от Эмиля**. Присылаете код, дифф или скриншот — получаете решение текстом или голосовым.',
        },
        {
          question: 'Не сожгу ли я все лимиты и токены?',
          answer: 'Контекст живёт в `CLAUDE.md`, rules и skills, поэтому его не нужно пересказывать вручную в каждом чате. Это сокращает лишний поиск и повторную работу.',
        },
        {
          question: 'Что если модели сменятся и всё устареет?',
          answer: 'Архитектура контекста, тесты, линтеры и правила репозитория не зависят от одной модели и переносятся на другие современные инструменты.',
        },
        {
          question: 'Не получится ли нечитаемый мусор и спагетти-код?',
          answer: 'ИИ работает по правилам проекта, а результат проверяется типами, линтерами и автотестами до ревью.',
        },
      ];

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
              {isAgents ? (
                <>
                  Создайте своих{' '}
                  <span className="relative inline-block whitespace-nowrap">
                    ИИ-агентов
                    <DoodleUnderline color="var(--color-goose-red)" className="w-full" />
                  </span>{' '}
                  <br />в Claude Code —{' '}
                  <span className="relative inline-block whitespace-nowrap">
                    с нуля
                    <DoodleUnderline thin color="var(--color-scarf-green)" className="w-full" />
                  </span>
                </>
              ) : landing.h1.includes('тимлида')
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
              {isAgents ? (
                <>
                  Установите Claude Code, научите его понимать{' '}
                  <span className="relative inline-block whitespace-nowrap text-brand-navy">
                    контекст вашего проекта
                    <DoodleUnderline thin color="var(--color-scarf-green)" className="opacity-70" />
                  </span>{' '}
                  и создайте агентов под повторяющиеся задачи.{`\n`}
                  Код вручную писать не придётся — вы разберётесь, где лежат инструкции и{' '}
                  <span className="relative inline-block whitespace-nowrap text-brand-navy">
                    как проверять результат
                    <DoodleUnderline thin color="var(--color-goose-red)" className="opacity-70" />
                  </span>
                  .
                </>
              ) : isVibe ? (
                // Лёгкие ручные подчёркивания под двумя обещаниями — как «тимлида» в заголовке
                <>
                  Обучаем ИИ правилам твоего репозитория:{' '}
                  <span className="relative inline-block whitespace-nowrap text-brand-navy">
                    CLAUDE.md, rules, линтер, типы и тесты
                    <DoodleUnderline thin color="var(--color-scarf-green)" className="opacity-70" />
                  </span>
                  .{'\n'}Модель сама исправляет ошибки по тестам и предлагает{' '}
                  <span className="relative inline-block whitespace-nowrap text-brand-navy">
                    чистые изолированные коммиты
                    <DoodleUnderline thin color="var(--color-scarf-green)" className="opacity-70" />
                  </span>
                  .
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
              {(isVibe || isAgents) && !cont ? (
                <>
                  {isAgents && (
                    <Link
                      href="/courses/claude-code-agents/lessons/1?from=course_landing"
                      className="btn-goose inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-navy px-6 text-base font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
                    >
                      Бесплатное введение (2 минуты)
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                  <a
                    href="#pricing"
                    className="inline-flex h-12 items-center gap-1.5 rounded-xl border-2 border-brand-navy/25 bg-brand-cream/80 px-5 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
                  >
                    К тарифам
                    <ArrowDown className="size-4" aria-hidden />
                  </a>
                  {!isAgents && (
                    <a
                      href={TELEGRAM_DM}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-navy/20 bg-card/60 px-5 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
                    >
                      <Send className="size-4" aria-hidden />
                      Личка
                    </a>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
            {(cont?.hint ?? landing.cta.hint) && (
              <p className="mt-2.5 text-xs text-muted-foreground">
                {cont?.hint ?? landing.cta.hint}
              </p>
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
          <dl className="mt-8 grid grid-cols-1 gap-y-5 border-y-2 border-brand-navy/10 py-6 sm:mt-11 sm:grid-cols-3 sm:gap-y-0 sm:py-7">
            {landing.facts.map((fact, idx) => (
              <div
                key={fact.label}
                className={`flex items-center gap-4 sm:block sm:px-6 ${idx > 0 ? 'border-t-2 border-brand-navy/10 pt-5 sm:border-l-2 sm:border-t-0 sm:pt-0' : ''}`}
              >
                <dt className="min-w-fit font-marker text-4xl leading-none text-brand-navy sm:text-6xl">{fact.value}</dt>
                <dd className="max-w-xs text-base font-bold leading-snug text-brand-charcoal text-pretty sm:mt-2 sm:text-lg">
                  {fact.label}
                </dd>
              </div>
            ))}
          </dl>
        )}

      </section>

      {/* Для вайбкодинга: техническое доказательство и сравнение хаос/система сразу после хиро */}
      {isVibe && (
        <>
          <VibeComparisonSection />
          {landing.caseStudy && (
            <section className="animate-rise">
              <CaseCycle data={landing.caseStudy} />
            </section>
          )}
        </>
      )}

      {/* Блок об авторе */}
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

              {/* Плагины автора с гитхабом */}
              <div className="pt-2">
                <div className="text-xs font-mono font-black uppercase tracking-wider text-brand-navy/60 mb-2.5">
                  Мои opensource инструменты:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://github.com/bubli-mubli/swarm-search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col justify-between rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-navy hover:bg-brand-cream hover:shadow-[0_4px_0_0_rgba(16,38,71,0.12)]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BrandLogo name="github" size="sm" />
                          <span className="font-heading font-black text-brand-navy group-hover:text-brand-navy transition-colors text-base">
                            swarm-search
                          </span>
                        </div>
                        <ArrowUpRight className="size-4 text-brand-navy/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-navy" />
                      </div>
                      <p className="mt-2 text-base leading-relaxed text-brand-charcoal/80 sm:text-[17px]">
                        Параллельный swarm research для Claude, GPT и Gemini: N дешёвых воркеров исследуют тему, один синтезирует выжимку с источниками.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md border border-brand-forest/25 bg-brand-forest/10 px-2.5 py-1 font-mono text-xs font-black text-brand-forest sm:text-sm">
                        параллельная работа нескольких моделей
                      </span>
                    </div>
                  </a>

                  <a
                    href="https://github.com/bubli-mubli/llm-council"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col justify-between rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-navy hover:bg-brand-cream hover:shadow-[0_4px_0_0_rgba(16,38,71,0.12)]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BrandLogo name="github" size="sm" />
                          <span className="font-heading font-black text-brand-navy group-hover:text-brand-navy transition-colors text-base">
                            llm-council
                          </span>
                        </div>
                        <ArrowUpRight className="size-4 text-brand-navy/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-navy" />
                      </div>
                      <p className="mt-2 text-base leading-relaxed text-brand-charcoal/80 sm:text-[17px]">
                        Совет моделей — независимое второе мнение от других LLM-семейств (Gemini, Codex, DeepSeek) для cross-check важных решений.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md border border-brand-forest/25 bg-brand-forest/10 px-2.5 py-1 font-mono text-xs font-black text-brand-forest sm:text-sm">
                        сложные решения
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Для других курсов с caseStudy (если есть) */}
      {!isVibe && landing.caseStudy && (
        <section className="animate-rise">
          <CaseCycle data={landing.caseStudy} />
        </section>
      )}

      {/* Результаты */}
      {landing.results.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            size="lg"
            title={isAgents ? 'Чему вы научитесь' : 'Что будет на выходе'}
            accent={isAgents ? 'научитесь' : 'на выходе'}
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {landing.results.map((item, idx) => {
              const isKiller = item.title.toLowerCase().includes('автотест') || (isVibe && idx === 2 && landing.results.length === 4);

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
                          <h3 className="font-heading text-2xl font-black leading-tight text-brand-navy sm:text-3xl">
                            {item.title}
                          </h3>
                          <span className="font-marker text-3xl sm:text-4xl leading-none text-brand-navy shrink-0">
                            0{idx + 1}
                          </span>
                        </div>
                        <div className="mt-4 text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty sm:text-xl">
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
                      <h3 className="font-heading text-2xl font-black leading-tight text-brand-navy sm:text-3xl">
                        {item.title}
                      </h3>
                      <span className="font-marker text-3xl sm:text-4xl leading-none text-brand-forest shrink-0">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="mt-4 text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty sm:text-xl">
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
                  {isAgents ? 'Хотите сначала разобраться, как давать ИИ задачи?' : 'Хотите так настроить свой проект под ИИ?'}
                </h4>
                <p className="mt-1 text-base font-medium leading-relaxed text-brand-charcoal/80 sm:text-lg">
                  {isAgents
                    ? '15 минут · без оплаты · контекст, постановка задачи и проверка ответа'
                    : 'Старт потока 14 сентября · Первый чистый коммит в первый день · Возврат 100% в первые 2 дня'}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 sm:items-end">
                {isAgents ? (
                  <Link
                    href="/courses/claude-code-agents/lessons/1?from=course_landing"
                    className="btn-goose inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-base font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-goose-red)]"
                  >
                    Посмотреть бесплатное введение
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <PrimaryCta
                    cont={cont}
                    cta={{ label: landing.cta.label, href: landing.cta.href, hint: '' }}
                    pricingHref={pricingHref}
                    courseSlug={key}
                    courseTitle={course.title}
                    className="btn-goose inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-sm font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-goose-red)]"
                  />
                )}
                {isAgents && (
                  <Link href="#pricing" className="text-sm font-bold text-brand-navy/70 underline underline-offset-4 hover:text-brand-navy sm:text-base">
                    Или сразу сравнить тарифы
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {landing.examples && landing.examples.length > 0 && (
        <section className="animate-rise space-y-8">
          <div className="grid gap-5 border-b-2 border-brand-navy/10 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SectionHead
              size="lg"
              title="Что может быть на выходе"
              accent="на выходе"
            />
            <div className="grid w-fit grid-cols-[auto_8.5rem] items-center gap-3 border-l-4 border-brand-yellow pl-4 sm:justify-self-end">
              <span className="font-marker text-6xl leading-none text-brand-red sm:text-7xl">99+</span>
              <span className="text-base font-bold leading-tight text-brand-navy sm:text-lg">других идей под вашу работу</span>
            </div>
          </div>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {landing.examples.map((item, idx) => (
              <article key={item.title} className="flex gap-5 border-t-2 border-brand-navy/12 pt-5">
                <span className="font-marker text-5xl leading-none text-brand-forest sm:text-6xl">0{idx + 1}</span>
                <div>
                  <h3 className="font-heading text-2xl font-black leading-tight text-brand-navy sm:text-3xl">{item.title}</h3>
                  <div className="mt-2 text-lg font-medium leading-relaxed text-brand-charcoal/90 sm:text-xl">
                    <RichText text={item.note} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {landing.scenarios && landing.scenarios.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead
            size="lg"
            title="Как это выглядит на реальной задаче"
            note="Не абстрактная «команда агентов», а понятный процесс с вашим контролем на каждом важном шаге."
          />
          <div className="space-y-5">
            {landing.scenarios.map((scenario, idx) => (
              <article key={scenario.before} className="rounded-3xl border-2 border-brand-navy/15 bg-card p-5 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] sm:p-7">
                <div className="mb-5 flex items-center gap-3 border-b-2 border-brand-navy/10 pb-4">
                  <span className="font-marker text-4xl leading-none text-brand-red">0{idx + 1}</span>
                  <h3 className="font-heading text-xl font-black text-brand-navy sm:text-2xl">Один законченный рабочий цикл</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-3 md:divide-x-2 md:divide-brand-navy/10">
                  {[
                    ['До', scenario.before],
                    ['Что делает агент', scenario.agent],
                    ['На выходе', scenario.after],
                  ].map(([label, value]) => (
                    <div key={label} className="md:px-5 md:first:pl-0 md:last:pr-0">
                      <p className="font-mono text-sm font-black uppercase tracking-wider text-brand-forest">{label}</p>
                      <p className="mt-2 text-lg font-medium leading-relaxed text-brand-charcoal sm:text-xl">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 border-l-4 border-brand-yellow px-4 py-2 text-base font-bold leading-relaxed text-brand-navy sm:text-lg">
                  Контроль человека: {scenario.control}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Кому подойдёт (после результатов) */}
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
              const accent = isVibe
                ? title.includes('вайбкодер') || idx === 0
                  ? { doodle: 'vibe', color: '#C2410C', bg: '#FFF1E8' }
                  : title.includes('разработчик') || idx === 1
                    ? { doodle: 'JS, PHP', color: '#1F6E43', bg: '#EDF6F0' }
                    : null
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
                      <h3 className="font-heading text-2xl font-black text-brand-navy sm:text-3xl">
                        {item.title}
                      </h3>
                      <span className="font-marker text-3xl leading-none text-brand-forest">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="mt-3.5 text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty sm:text-xl">
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

      {landing.requirements && landing.requirements.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead size="lg" title="Что нужно для старта" />
          <dl className="divide-y-2 divide-dashed divide-brand-navy/10 border-y-2 border-dashed border-brand-navy/10">
            {landing.requirements.map((item) => (
              <div key={item.label} className={`grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-8 sm:py-5 ${item.label === 'В подарок' ? 'my-2 rounded-2xl bg-brand-yellow px-5 sm:px-6' : ''}`}>
                <dt className={`font-mono text-sm font-black uppercase tracking-wider ${item.label === 'В подарок' ? 'text-brand-red' : 'text-brand-navy/55'}`}>{item.label}</dt>
                <dd className="font-heading text-xl font-black leading-snug text-brand-navy sm:text-2xl">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Программа */}
      {landing.program.length > 0 && (
        <section className="animate-rise space-y-8">
          <SectionHead size="lg" title="Программа обучения" />

          {/* Условия участия рядом с программой: нагрузка, сроки, домашки, подписки */}
          {landing.terms && landing.terms.length > 0 && (
            <dl className={isAgents ? 'grid border-y-2 border-brand-navy/10 py-6 sm:grid-cols-3 sm:py-7' : 'divide-y-2 divide-dashed divide-brand-navy/10 border-y-2 border-dashed border-brand-navy/10'}>
              {landing.terms.map((t) => (
                <div key={t.label} className={isAgents ? 'flex flex-col items-center border-t-2 border-brand-navy/10 px-5 py-5 text-center first:border-t-0 sm:border-l-2 sm:border-t-0 sm:py-1 sm:first:border-l-0' : 'grid grid-cols-1 gap-x-8 gap-y-1 py-4 sm:grid-cols-[12rem_1fr] sm:items-baseline sm:py-5'}>
                  <dt className={isAgents ? 'font-marker text-5xl leading-none text-brand-navy sm:text-6xl' : 'font-mono text-xs font-black uppercase tracking-wider text-brand-navy/55 sm:text-sm'}>{t.label}</dt>
                  <dd className={isAgents ? 'mt-2 max-w-64 text-base font-bold leading-snug text-brand-charcoal sm:text-lg' : 'font-heading text-xl font-black leading-snug text-brand-navy text-pretty sm:text-2xl'}>{t.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={isAgents ? 'grid gap-x-10 gap-y-0 sm:grid-cols-2' : 'space-y-3.5'}>
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
                        <h3 className="font-heading text-xl font-black text-brand-navy sm:text-2xl">
                          {item.title}
                        </h3>
                        {item.note && (
                          <div className="mt-2 text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty sm:text-xl">
                            <RichText text={item.note} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return isAgents ? (
                <article key={item.title} className="grid grid-cols-[4rem_1fr] gap-4 border-t-2 border-brand-navy/10 py-6 sm:grid-cols-[5rem_1fr]">
                  <span className="font-marker text-5xl leading-none text-brand-forest sm:text-6xl">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-heading text-xl font-black leading-tight text-brand-navy sm:text-2xl">{item.title.replace(/^\d+\.\s*/, '')}</h3>
                    <div className="mt-2 text-base font-medium leading-relaxed text-brand-charcoal/85 sm:text-lg">
                      <RichText text={item.note} />
                    </div>
                  </div>
                </article>
              ) : (
                <div
                  key={item.title}
                  className="group flex items-start gap-4 rounded-2xl border-2 border-brand-navy/15 bg-card p-5 sm:gap-6 sm:p-6 shadow-xs transition-all hover:border-brand-navy hover:shadow-[0_4px_0_0_rgba(16,38,71,0.08)]"
                >
                  <span className="font-marker text-3xl sm:text-5xl leading-none text-brand-forest shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xl font-black text-brand-navy sm:text-2xl">
                      {item.title}
                    </h3>
                    {item.note && (
                      <div className="mt-2 text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty sm:text-xl">
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

      {/* Форматы участия: тарифы с ценой и составом прямо на странице (подняты сразу после программы) */}
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
              note={isAgents ? undefined : landing.price.note}
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
            <div className="max-w-xl text-lg font-medium leading-relaxed text-brand-charcoal/85 text-pretty sm:text-xl">
              {cont ? (
                <p>
                  Обучение уже оплачено — {cont.hint.toLowerCase()}. Прогресс сохраняется, возвращайтесь в любой момент.
                </p>
              ) : showTariffs ? (
                <RichText text={isAgents
                  ? 'Напишите пару слов о том, **что хотите создать или какую задачу упростить** — подскажу подходящий формат и с чего лучше начать.'
                  : 'Напиши пару слов о проекте и стеке — **подскажу, хватит ли самостоятельного формата** или нужна поддержка.'}
                />
              ) : (
                <RichText text={landing.price.note} />
              )}
            </div>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center">
              {showTariffs ? (
                <a
                  href={TELEGRAM_DM}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-scarf inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-scarf-green)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-scarf-green)] motion-reduce:hover:translate-y-0"
                >
                  <Send className="size-4" aria-hidden />
                  Написать в личку
                </a>
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
                      <div className="mt-4 text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty sm:text-xl">
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
                    <div className="mt-4 text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty sm:text-xl">
                      <RichText text={item.note} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Блок «Как проходит обучение» в стиле Вопрос-Ответ (6 пунктов с сомнениями) */}
      {landing.format.length > 0 && (
        <section className="animate-rise space-y-6 pt-4">
          <SectionHead
            size="lg"
            title="Как проходит обучение: вопросы и ответы"
            accent="вопросы и ответы"
          />
          <div className="space-y-3">
            {isAgents ? faqItems.map((item) => (
              <details key={item.question} className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)] sm:p-7">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-xl font-black text-brand-navy select-none sm:text-2xl">
                  <span>{item.question}</span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-navy/10 bg-brand-navy/5 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                    <ChevronDown className="size-5" />
                  </span>
                </summary>
                <div className="mt-4 border-t border-dashed border-brand-navy/10 pt-4 text-lg font-medium leading-relaxed text-brand-charcoal/90 sm:text-xl">
                  <RichText text={item.answer} />
                </div>
              </details>
            )) : <>
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
                <span>Подойдёт ли курс, если у меня другой стек или закрытый код?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90 space-y-2">
                <p>
                  <RichText text="**Стек не имеет значения.** Метод показывает настройку архитектуры ИИ. Вместо TypeScript и Vitest на Python настраиваются `ruff` и `pytest`, на PHP — `PHPStan` и `Pest`, на Go — `golangci-lint` и `go test`. Правила репозитория, `CLAUDE.md` и формат изоляции диффов одинаковы для любого языка." />
                </p>
                <p>
                  <RichText text="**Закрытый рабочий код показывать не нужно.** Вы можете проходить все задания на отдельном учебном репозитории или пет-проекте без риска раскрытия коммерческой тайны. Автор видит только те фрагменты, которые вы сами отправляете в чат разбора." />
                </p>
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

            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>Не сожгу ли я все лимиты и токены?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90">
                <RichText text="**Наоборот, расход станет меньше.** Контекст живёт в `CLAUDE.md`, rules и skills, а не пересказывается вручную в каждом чате: **модель читает правила из файлов проекта**. Пересказ стека, зависимостей и архитектуры из каждого диалога навсегда уходит." />
              </div>
            </details>

            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>Что если модели сменятся и всё устареет?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90">
                <RichText text="**Инженерная настройка не привязана к вендору.** Сегодня вы работаете с Claude Code, завтра с Codex, Gemini или DeepSeek. Архитектура файлов контекста, тесты, линтеры и правила репозитория работают одинаково с любой современной моделью." />
              </div>
            </details>

            <details className="group rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy open:shadow-[0_6px_0_0_rgba(16,38,71,0.1)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-lg sm:text-xl font-black text-brand-navy list-none select-none">
                <span>Не получится ли нечитаемый мусор и спагетти-код?</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-brand-navy transition-transform duration-200 group-open:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </summary>
              <div className="mt-3.5 border-t border-dashed border-brand-navy/10 pt-3.5 text-[17px] font-medium leading-relaxed sm:text-lg text-brand-charcoal/90">
                <RichText text="**ИИ пишет строго по правилам вашего проекта.** Структура папок, типизация TypeScript и линтеры зафиксированы в конфиге. Код **проходит проверку линтером, типами и автотестами ещё до того, как попадёт к вам на ревью**." />
              </div>
            </details>
            </>}
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
