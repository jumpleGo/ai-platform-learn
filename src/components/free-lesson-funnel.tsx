import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';
import { Accent, StickerTag } from '@/components/accent';
import { Markdown } from '@/components/markdown';
import { FreeLessonCta, FreeLessonTelegramLink } from '@/components/free-lesson-cta';
import { TELEGRAM_URL, type FreeLessonContent } from '@/lib/free-lessons';

export function FreeLessonMarker() {
  // наклейка вместо мелкой надстрочной строки: тот же сигнал, но в стиле бренда
  return <StickerTag tone="sky">открытый урок программы</StickerTag>;
}

export function FreeLessonAfterVideo({ content, materials, ctaHref }: {
  content: FreeLessonContent;
  materials: string;
  ctaHref: string;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="lesson-results" className="rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/60 p-5 shadow-[0_3px_0_0_rgba(16,38,71,0.06)] sm:p-7">
        <h2 id="lesson-results" className="font-heading text-lg sm:text-2xl font-extrabold tracking-tight text-brand-navy text-balance">
          Что вы <Accent color="var(--color-brand-forest)">поймёте</Accent> после просмотра
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {content.outcomes.map((outcome, idx) => (
            <li
              key={outcome}
              className="flex items-start gap-3.5 rounded-xl border-2 border-brand-navy/12 bg-card p-3.5 shadow-xs transition-all hover:border-brand-navy hover:shadow-sm sm:p-4"
            >
              <span className="font-marker text-3xl leading-none text-brand-forest shrink-0">
                {idx + 1}.
              </span>
              <span className="text-sm font-bold leading-snug text-brand-navy text-pretty">{outcome}</span>
            </li>
          ))}
        </ul>
      </section>

      {materials.trim() && (
        <details open className="group rounded-2xl border border-border bg-card/60 px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold marker:content-none sm:text-lg">
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
