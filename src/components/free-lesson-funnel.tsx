import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';
import { Accent, StickerTag } from '@/components/accent';
import { Markdown } from '@/components/markdown';
import { FreeLessonCta, FreeLessonTelegramLink } from '@/components/free-lesson-cta';
import { TELEGRAM_URL, type FreeLessonContent } from '@/lib/free-lessons';

// Цвета плиток пользы: голубой, жёлтый, зелёный — по палитре бренда
const OUTCOME_TONES = [
  'bg-brand-sky text-brand-navy',
  'bg-brand-yellow text-brand-charcoal',
  'bg-brand-forest text-brand-cream',
] as const;

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
    <div className="space-y-8 sm:space-y-10">
      <section aria-labelledby="lesson-results" className="rounded-3xl border border-border bg-card px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <h2 id="lesson-results" className="max-w-2xl font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Что вы <Accent>поймёте</Accent> после просмотра
        </h2>
        {/* Польза — в цветах бренда: три плитки, каждая своим цветом, чтобы блок
            читался как результат, а не как ещё один абзац текста. */}
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {content.outcomes.map((outcome, i) => (
            <li
              key={outcome}
              className={`flex min-h-36 flex-col justify-between gap-5 rounded-2xl p-5 text-base leading-snug font-semibold sm:min-h-44 ${OUTCOME_TONES[i % OUTCOME_TONES.length]}`}
            >
              <span className="text-balance">{outcome}</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-black/10">
                <Check className="size-4" aria-hidden />
              </span>
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
