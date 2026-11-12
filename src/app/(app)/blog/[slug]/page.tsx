import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';
import { BLOG_POSTS, blogPostUrl, getBlogPost, readingMinutes } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { BLOG_CRUMB, breadcrumbList, HOME_CRUMB } from '@/lib/breadcrumbs';
import { Markdown } from '@/components/markdown';
import { BlogLessonNextStep } from '@/components/blog-lesson-next-step';
import { parseBlocks } from '@/lib/markdown';
import Image from 'next/image';
import { StickerTag } from '@/components/accent';
import { nbsp, nbspMarkdown } from '@/lib/typography';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const canonical = blogPostUrl(post.slug);
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.seoTitle,
      description: post.seoDescription,
      publishedTime: post.published,
      modifiedTime: post.updated,
      images: [{ url: post.cover, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seoTitle,
      description: post.seoDescription,
      images: [post.cover],
    },
  };
}

// Article + FAQPage: оба узла описывают то, что человек видит на странице —
// текст статьи и блок вопросов под ним
function postJsonLd(post: (typeof BLOG_POSTS)[number]) {
  const canonical = blogPostUrl(post.slug);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: post.title,
        description: post.seoDescription,
        url: canonical,
        inLanguage: 'ru',
        datePublished: post.published,
        dateModified: post.updated,
        author: { '@type': 'Person', name: 'Эмиль', url: SITE_URL },
        publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntityOfPage: canonical,
        image: `${SITE_URL}${post.cover}`,
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
      breadcrumbList([HOME_CRUMB, BLOG_CRUMB, { name: post.title, url: canonical }]),
    ],
  };
}

export default async function BlogPostPage({ params }: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const body = nbspMarkdown(post.body);
  const firstThirdEnd = Math.max(0, Math.ceil(parseBlocks(body).length / 3) - 1);

  return (
    <div className="space-y-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post)).replace(/</g, '\\u003c') }}
      />

      {/* Ширина колонки — под чтение: примерно 65–75 знаков в строке */}
      <article className="animate-rise mx-auto max-w-[46rem] pt-6 sm:pt-10">
        <Link
          href="/blog"
          className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          Блог
        </Link>

        <h1 className="mt-4 font-heading text-[clamp(2rem,5vw,3.25rem)]/[1.05] font-extrabold tracking-[-0.03em] text-balance text-brand-navy">
          {nbsp(post.title)}
        </h1>
        <p className="mt-3 text-lg leading-[1.4] text-muted-foreground text-pretty">{nbsp(post.lead)}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-6 font-mono text-xs text-muted-foreground">
          <time dateTime={post.published}>{dateFormat.format(new Date(post.published))}</time>
          <span aria-hidden>·</span>
          <span>{readingMinutes(post)} мин чтения</span>
          <span aria-hidden>·</span>
          <span>Эмиль, автор школы GELATO</span>
        </div>

        {/* Обложка в стиле Gelato: та же картинка уходит в OG и в разметку статьи */}
        <Image
          src={post.cover}
          alt={post.title}
          width={1600}
          height={900}
          priority
          sizes="(min-width: 768px) 46rem, 100vw"
          className="mt-8 aspect-[16/9] w-full rounded-2xl border-2 border-brand-navy/12 object-cover"
        />

        <Markdown
          source={body}
          variant="read"
          className="mt-8"
          insertAfterBlock={{
            index: firstThirdEnd,
            content: <BlogLessonNextStep slug={post.slug} position="after_first_third" />,
          }}
        />

        <BlogLessonNextStep slug={post.slug} position="after_body" />

        {post.faq.length > 0 && (
          <section aria-labelledby="post-faq" className="mt-14">
            <h2 id="post-faq" className="font-heading text-2xl font-extrabold tracking-tight text-brand-navy sm:text-[1.75rem]">
              Частые вопросы
            </h2>
            <dl className="mt-5 space-y-4">
              {post.faq.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border-2 border-brand-navy/12 bg-card p-5 shadow-[0_2px_0_0_rgba(16,38,71,0.05)]"
                >
                  <dt className="font-heading text-base font-extrabold text-brand-navy text-pretty sm:text-lg">
                    {nbsp(item.question)}
                  </dt>
                  <dd className="mt-2 leading-relaxed text-pretty text-muted-foreground">{nbsp(item.answer)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {post.lessonPath && (
          <aside className="mt-12 rounded-2xl border-2 border-brand-navy bg-brand-yellow/30 p-6 shadow-[0_4px_0_0_rgba(16,38,71,0.1)]">
            <StickerTag tone="navy">то же самое видео</StickerTag>
            <p className="mt-3 font-heading text-lg font-extrabold text-brand-navy text-balance sm:text-xl">
              Этот разбор есть в&nbsp;виде урока
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-charcoal/85 text-pretty">
              Смотреть можно бесплатно и&nbsp;без регистрации — как удобнее, так и&nbsp;изучайте.
            </p>
            <Link
              href={post.lessonPath}
              className="btn-goose mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-sm font-extrabold text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
            >
              <PlayCircle className="size-4" aria-hidden />
              Смотреть урок
            </Link>
          </aside>
        )}
      </article>

      {others.length > 0 && (
        <section className="mx-auto max-w-[46rem]">
          <h2 className="font-heading text-xl font-extrabold tracking-tight text-brand-navy">Читать дальше</h2>
          <ul className="mt-4 space-y-3">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/blog/${other.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-brand-navy"
                >
                  <span className="font-heading text-base font-bold text-brand-navy text-pretty">{nbsp(other.title)}</span>
                  <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
