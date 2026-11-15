import type { Metadata } from 'next';
import Link from 'next/link';
import { REVIEWS, REVIEW_COURSES } from '@/lib/reviews';
import { StickerTag, TitleAccent } from '@/components/accent';

export const metadata: Metadata = {
  title: 'Отзывы учеников о курсах GELATO',
  description:
    'Живые отзывы учеников школы GELATO: что получилось после обучения работе с ИИ, Claude Code и нейросетями.',
  alternates: { canonical: '/reviews' },
};

// Название курса для подписи под карточкой
const courseTitle = new Map(REVIEW_COURSES.map((c) => [c.slug, c.title]));

export default function ReviewsPage() {
  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="animate-rise pt-6 sm:pt-10">
        <StickerTag tone="sky">без редактуры смысла</StickerTag>
        <h1 className="mt-4 font-heading text-[clamp(2.6rem,7vw,5.25rem)]/[0.98] font-bold tracking-[-0.035em] text-balance text-brand-navy">
          <TitleAccent>Отзывы</TitleAccent> учеников
        </h1>
        <p className="mt-2.5 max-w-2xl text-lg leading-[1.35] text-muted-foreground text-pretty sm:text-xl">
          Что получилось у людей после обучения. У каждого отзыва указан курс, на котором учился автор отзыва.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {REVIEWS.map((review, index) => (
          <blockquote
            key={review.text}
            className={`animate-rise relative flex flex-col rounded-2xl border-2 border-brand-navy bg-card px-5 pb-5 pt-10 text-lg font-bold leading-relaxed text-pretty text-brand-navy shadow-[0_4px_0_0_rgba(16,38,71,0.14)] ${index % 2 === 0 ? 'sm:-rotate-1' : 'sm:rotate-1'}`}
          >
            <span className="absolute left-5 top-3 font-marker text-5xl leading-none text-brand-red" aria-hidden>“</span>
            <span className="flex-1">«{review.text}»</span>
            <footer className="mt-4 border-t border-brand-navy/15 pt-3 font-mono text-xs font-medium text-muted-foreground">
              курс{' '}
              <Link href={`/courses/${review.course}`} className="text-brand-navy underline underline-offset-4 hover:text-brand-red">
                «{courseTitle.get(review.course)}»
              </Link>
            </footer>
          </blockquote>
        ))}
      </section>
    </div>
  );
}
