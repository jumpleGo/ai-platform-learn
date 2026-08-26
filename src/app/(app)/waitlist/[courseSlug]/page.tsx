import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { getTestCourse } from '@/lib/db/courses';
import { DoodleWord } from '@/components/doodle-decor';
import { courseKey, waitlistPath } from '@/lib/slug';

const PROMO_URL = 'https://start.gelato.su';

export default async function WaitlistPage({ params }: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await getTestCourse(courseSlug);
  if (!course) notFound();
  // пришли по старому адресу с id — уводим на человекочитаемый
  if (courseSlug !== courseKey(course)) permanentRedirect(waitlistPath(courseKey(course)));

  // Владелец сайта сам вставляет готовый HTML в админке — доверенный контент, не пользовательский ввод
  if (course.testLandingHtml) {
    return (
      <div
        className="mx-auto max-w-2xl"
        dangerouslySetInnerHTML={{ __html: course.testLandingHtml }}
      />
    );
  }

  return (
    <section className="animate-rise relative mx-auto max-w-xl" style={{ '--rise-delay': '0.08s' } as React.CSSProperties}>
      <DoodleWord
        text="скоро"
        color="oklch(0.535 0.1893 28.3)"
        className="z-10 -top-4 left-4 text-xl -rotate-6 sm:-top-6 sm:text-2xl"
      />
      <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/30 bg-brand-yellow px-6 py-10 sm:px-12 sm:py-12">
        <div className="relative space-y-4">
          <p className="font-mono text-sm text-brand-charcoal/70">$ предзапись</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {course.title}
          </h1>
          <p className="leading-relaxed text-brand-charcoal/75 text-pretty">
            Курс скоро откроется. Оставьте заявку, чтобы попасть в число первых — вам напишут,
            как только появится доступ.
          </p>
          <a
            href={PROMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            Записаться
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
