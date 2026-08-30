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

// Оплативший приходит на лендинг за входом в уроки, а не за офером: продающие
// кнопки уступают место переходу к первому непройденному уроку.
type Continue = { href: string; label: string; hint: string };

// Главная кнопка лендинга: у оплатившего — внутренний переход к урокам,
// у остальных — внешняя оплата. Классы приходят с места вызова: в хиро и в
// блоке стоимости кнопка выровнена по-разному.
function PrimaryCta({ cont, cta, className }: {
  cont: Continue | null;
  cta: CourseLanding['cta'];
  className: string;
}) {
  return cont ? (
    <Link href={cont.href} className={className}>
      {cont.label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  ) : (
    <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className}>
      {cta.label}
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
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

// Плитки фактов в хиро — в цветах бренда
const FACT_TONES = ['bg-brand-sky/45', 'bg-brand-yellow/55', 'bg-brand-green/25'] as const;

// Плитки результата — в цветах бренда: это главный блок пользы на лендинге
const RESULT_TONES = [
  'bg-brand-sky/45',
  'bg-brand-yellow/55',
  'bg-brand-green/25',
  'bg-brand-red/12',
] as const;

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
              <div className="mt-6 flex w-fit flex-wrap items-center gap-3.5 rounded-2xl border-2 border-brand-navy/15 bg-brand-yellow px-4 py-3">
                <span className="font-marker text-3xl leading-none text-brand-red">{landing.offer.badge}</span>
                <span className="max-w-xs text-sm leading-snug font-medium text-brand-charcoal/85 text-pretty">
                  {landing.offer.text}
                </span>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryCta
                cont={cont}
                cta={landing.cta}
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
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {landing.facts.map((fact, i) => (
              <li
                key={fact.label}
                className={`rounded-2xl border-2 border-brand-navy/12 px-5 py-4 ${FACT_TONES[i % FACT_TONES.length]}`}
              >
                <p className="font-marker text-4xl leading-none text-brand-navy">{fact.value}</p>
                <p className="mt-2 text-sm leading-snug font-medium text-brand-charcoal/80 text-pretty">
                  {fact.label}
                </p>
              </li>
            ))}
          </ul>
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
          <div className="rounded-3xl border-2 border-dashed border-primary/25 bg-brand-yellow/60 px-6 py-9 sm:px-10 sm:py-11">
            <SectionHead
              title="Что обычно идёт не так"
              accent="не так"
              note="Самые популярные проблемы начинашек."
            />
            <ul className="mt-7 grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {landing.pains.map((pain) => (
                <li key={pain} className="flex gap-3 text-[15px] leading-snug text-pretty">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-navy/12 text-brand-navy">
                    <Minus className="size-3" aria-hidden />
                  </span>
                  {pain}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Результаты */}
      {landing.results.length > 0 && (
        <section className="animate-rise space-y-10">
          <SectionHead
            title="Что будет на выходе"
            accent="на выходе"
            note="Конкретные вещи, которые останутся в вашем проекте."
          />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {landing.results.map((item, i) => (
              <li
                key={item.title}
                className={`animate-float flex min-h-32 flex-col justify-between gap-4 rounded-2xl border-2 border-brand-navy/12 p-5 ${RESULT_TONES[i % RESULT_TONES.length]}`}
                style={{ '--rise-delay': `${i * 0.06}s` } as React.CSSProperties}
              >
                <div>
                  <p className="text-base leading-snug font-extrabold text-brand-navy">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-charcoal/80 text-pretty">{item.note}</p>
                </div>
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-navy/12 text-brand-navy">
                  <Check className="size-4" aria-hidden />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Программа */}
      {landing.program.length > 0 && (
        <section className="animate-rise space-y-10">
          <SectionHead
            title="Что внутри"
            note="Каждый пункт заканчивается практикой на вашем проекте."
          />
          <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/50">
            {landing.program.map((item, i) => (
              <li key={item.title} className="flex gap-4 px-5 py-4 sm:gap-6 sm:px-6">
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] leading-snug font-bold text-balance">{item.title}</p>
                  {item.note && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{item.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Кому подойдёт */}
      {landing.audience.length > 0 && (
        <section className="animate-rise space-y-10">
          <SectionHead
            title="Кому подойдёт"
            note="Хотя бы один пункт про вас — обучение зайдёт."
          />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {landing.audience.map((item) => (
              <li key={item.title} className="flex gap-3.5 rounded-2xl border border-border bg-card/60 p-5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-forest">
                  <Check className="size-3.5" aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] leading-snug font-bold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Почему мы */}
      {landing.why.length > 0 && (
        <section className="animate-rise space-y-10">
          <SectionHead
            title="Чем это отличается от курса на большой платформе"
            note="Там пишут методисты по шаблону и обновляют раз в год. Здесь — практик, который переписывает урок, когда меняется инструмент."
            action={{ href: '/faq', label: 'Все возражения' }}
          />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {landing.why.map((item) => (
              <li key={item.title} className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
                <p className="font-heading text-lg font-bold tracking-tight">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{item.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Формат работы */}
      {landing.format.length > 0 && (
        <section className="animate-rise space-y-10">
          <SectionHead title="Как проходит обучение" />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {landing.format.map((item, i) => (
              <li
                key={item.title}
                className="animate-float rounded-2xl border border-border bg-card/60 p-5"
                style={{ '--rise-delay': `${i * 0.06}s` } as React.CSSProperties}
              >
                <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
                <p className="mt-2 text-[15px] leading-snug font-bold">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{item.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Стоимость и финальный призыв */}
      <section className="animate-rise relative">
        <DoodleWord
          text="дальше просто"
          color="oklch(0.2705 0.0677 258.4)"
          className="z-10 -top-4 left-5 text-lg -rotate-6 sm:-top-5 sm:left-9 sm:text-xl"
        />
        {/* Финальный CTA — бумажная текстура и рамка-тельняшка, как у баннеров
            бренда: бледная плашка на этом месте не держала внимание. */}
        <div className="banner-marine-frame grid grid-cols-1 gap-8 overflow-hidden rounded-3xl px-6 py-9 sm:px-10 sm:py-11 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-[1.9rem]/[1.05] font-extrabold tracking-[-0.025em] text-balance text-brand-navy sm:text-[2.4rem]/[1.02]">
              {cont ? 'Доступ открыт' : landing.price.value}
            </h2>
            <p className="max-w-md leading-relaxed font-medium text-brand-charcoal/80 text-pretty">
              {cont
                ? `Обучение уже оплачено — ${cont.hint.toLowerCase()}. Прогресс сохраняется, возвращайтесь в любой момент.`
                : landing.price.note}
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center">
              <PrimaryCta
                cont={cont}
                cta={landing.cta}
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
            {/* такса добивает блок картинкой: стоит под кнопками у левого края
                и не спорит с составом обучения справа */}
            <Image
              src="/banner-lesson-dachshund.webp"
              alt=""
              width={660}
              height={809}
              aria-hidden
              className="pointer-events-none mt-auto -mb-9 w-[150px] max-w-full select-none sm:-mb-11 sm:w-[210px]"
            />
          </div>

          {landing.price.includes.length > 0 && (
            <div className="rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/90 p-5 sm:p-6">
              <p className="font-marker text-base text-brand-navy">Что входит</p>
              <ul className="mt-3.5 space-y-2.5">
                {landing.price.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-snug font-medium text-brand-charcoal/85 text-pretty">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-navy/12 text-brand-navy">
                      <Check className="size-3" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
