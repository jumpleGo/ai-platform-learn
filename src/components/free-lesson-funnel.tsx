import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';
import { Markdown } from '@/components/markdown';
import { FreeLessonCta, FreeLessonTelegramLink } from '@/components/free-lesson-cta';
import { TELEGRAM_URL, type FreeLessonContent } from '@/lib/free-lessons';

export function FreeLessonMarker() {
  return (
    <p className="font-mono text-sm font-medium tracking-wide text-primary uppercase">
      Открытый урок из программы Gelato
    </p>
  );
}

export function FreeLessonAfterVideo({ content, materials, ctaHref }: {
  content: FreeLessonContent;
  materials: string;
  ctaHref: string;
}) {
  return (
    <div className="space-y-8 sm:space-y-10">
      <section aria-labelledby="lesson-results" className="rounded-3xl border border-border bg-card px-5 py-7 shadow-sm sm:px-8 sm:py-9">
        <p className="font-mono text-sm font-medium tracking-wide text-primary uppercase">Результат урока</p>
        <h2 id="lesson-results" className="mt-2 max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Что вы поймёте после просмотра
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {content.outcomes.map((outcome) => (
            <li key={outcome} className="flex min-h-32 flex-col justify-between gap-5 rounded-2xl bg-secondary p-5 text-base font-medium leading-relaxed sm:min-h-40">
              <span>{outcome}</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Check className="size-4" aria-hidden />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {materials.trim() && (
        <details open className="group rounded-2xl border border-border bg-card/60 px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold marker:content-none sm:text-lg">
            Дополнительные материалы и ссылки
            <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <Markdown source={materials} className="mt-4 border-t border-border pt-5" />
        </details>
      )}

      {/* фон — бумажная текстура, по краю рамка-тельняшка как на майке таксы */}
      <section className="banner-marine-frame relative overflow-hidden rounded-3xl px-5 pt-9 pb-40 sm:px-9 sm:py-11">
        {/* такса в правом нижнем углу; края растворены в текстуру прямо в файле */}
        <Image
          src="/banner-lesson-dachshund.webp"
          alt=""
          width={660}
          height={809}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 w-[120px] select-none sm:w-[200px] lg:w-[260px]"
        />
        <div className="relative max-w-2xl">
          <h2 className="font-heading text-[1.75rem] leading-[1.03] font-extrabold tracking-[-0.022em] text-balance text-brand-navy sm:text-[2.5rem] whitespace-pre-line">{content.bridgeTitle}</h2>
          <p className="mt-4 max-w-xl text-base leading-snug font-medium text-pretty text-brand-charcoal/80 sm:text-lg">{content.bridgeText}</p>
          <div className="mt-6 flex flex-col items-start gap-3">
            <FreeLessonCta href={ctaHref} label={content.ctaLabel} lessonId={content.lessonId} position="primary" />
            <FreeLessonTelegramLink href={TELEGRAM_URL} lessonId={content.lessonId} position="primary" />
          </div>
        </div>
      </section>
    </div>
  );
}
