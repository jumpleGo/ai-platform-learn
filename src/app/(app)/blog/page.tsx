import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BLOG_POSTS, readingMinutes } from '@/lib/blog';
import { StickerTag, TitleAccent } from '@/components/accent';

export const metadata: Metadata = {
  title: 'Блог о работе с ИИ — разборы и инструкции | GELATO',
  description:
    'Разборы о работе с нейросетями: как объяснить задачу, куда уходят лимиты и токены, почему модель выдумывает ответы. Без воды, с примерами и чек-листами.',
  alternates: { canonical: '/blog' },
};

// Статьи отсортированы от свежих к старым: дату правим руками в lib/blog.ts
const posts = [...BLOG_POSTS].sort((a, b) => b.published.localeCompare(a.published));

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogPage() {
  return (
    <div className="space-y-14 sm:space-y-16">
      <section className="animate-rise pt-6 sm:pt-10">
        <StickerTag tone="sky">читать, а не смотреть</StickerTag>
        <h1 className="mt-4 font-heading text-[clamp(2.6rem,7vw,5.25rem)]/[0.98] font-bold tracking-[-0.035em] text-balance text-brand-navy">
          <TitleAccent>Блог</TitleAccent>
        </h1>
        <p className="mt-2.5 max-w-2xl text-lg leading-[1.35] text-muted-foreground text-pretty sm:text-xl">
          Разборы про работу с&nbsp;ИИ: как объяснить задачу, куда уходят лимиты
          и&nbsp;почему модель выдумывает ответы. Те&nbsp;же принципы, что и&nbsp;в&nbsp;уроках,
          только текстом.
        </p>
      </section>

      <section>
        <ul className="space-y-5">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border-2 border-brand-navy/15 bg-card p-6 shadow-[0_3px_0_0_rgba(16,38,71,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[0_5px_0_0_rgba(16,38,71,0.12)] motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span className="rounded-full bg-brand-sky/20 px-2.5 py-0.5 font-sans font-bold text-brand-navy">
                    {post.topic}
                  </span>
                  <time dateTime={post.published}>{dateFormat.format(new Date(post.published))}</time>
                  <span aria-hidden>·</span>
                  <span>{readingMinutes(post)} мин чтения</span>
                </div>
                <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-balance text-brand-navy sm:text-3xl">
                  {post.title}
                </h2>
                <p className="mt-2.5 max-w-2xl leading-relaxed text-pretty text-muted-foreground">
                  {post.lead}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-navy">
                  Читать
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
