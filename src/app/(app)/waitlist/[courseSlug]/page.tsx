import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { getTestCourse } from '@/lib/db/courses';
import { DoodleWord } from '@/components/doodle-decor';
import { courseKey, waitlistPath } from '@/lib/slug';

const PROMO_URL = 'https://vibe.gelato.education';

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
      <div className="banner-goose-frame relative overflow-hidden rounded-3xl px-6 pt-10 pb-36 sm:px-12 sm:py-12">
        <Image
          src="/banner-home-goose.webp"
          alt=""
          width={760}
          height={619}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 w-[150px] select-none sm:w-[260px]"
        />
        <div className="relative max-w-xl space-y-4">
          <h1 className="font-heading text-[1.9rem]/[1.05] font-extrabold tracking-[-0.025em] text-balance text-brand-navy sm:text-[2.4rem]/[1.02]">
            {course.title}
          </h1>
          <p className="leading-relaxed font-medium text-brand-charcoal/80 text-pretty">
            Курс скоро откроется. Оставьте заявку, чтобы попасть в число первых — вам напишут,
            как только появится доступ.
          </p>
          <a
            href={PROMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-goose inline-flex h-12 items-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
          >
            Записаться
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
