import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StickerTag } from '@/components/accent';
import { Markdown } from '@/components/markdown';
import {
  SITE_URL, STANDALONE_FREE_LESSONS, getStandaloneFreeLesson, standaloneFreeLessonPath,
} from '@/lib/free-lessons';
import { nbsp, nbspMarkdown } from '@/lib/typography';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STANDALONE_FREE_LESSONS.filter((lesson) => lesson.published)
    .map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getStandaloneFreeLesson(slug);
  if (!lesson) notFound();
  const canonical = `${SITE_URL}${standaloneFreeLessonPath(lesson.slug)}`;
  return {
    title: lesson.seoTitle,
    description: lesson.seoDescription,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: lesson.seoTitle,
      description: lesson.seoDescription,
    },
    twitter: {
      card: 'summary',
      title: lesson.seoTitle,
      description: lesson.seoDescription,
    },
  };
}

export default async function StandaloneFreeLessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = getStandaloneFreeLesson(slug);
  if (!lesson) notFound();
  const canonical = `${SITE_URL}${standaloneFreeLessonPath(lesson.slug)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${canonical}#lesson`,
    url: canonical,
    name: lesson.h1,
    description: lesson.seoDescription,
    inLanguage: 'ru',
    learningResourceType: 'Практикум',
    isAccessibleForFree: true,
  };

  return (
    <article className="animate-rise mx-auto max-w-[46rem] pt-6 sm:pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <Link href="/free" className="text-sm text-muted-foreground underline underline-offset-4">
        Все бесплатные уроки
      </Link>
      <div className="mt-6"><StickerTag>Бесплатный практикум</StickerTag></div>
      <h1 className="mt-5 font-heading text-[clamp(2rem,5vw,3.25rem)]/[1.05] font-extrabold tracking-[-0.03em] text-balance text-brand-navy">
        {nbsp(lesson.h1)}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{nbsp(lesson.lead)}</p>
      <Markdown source={nbspMarkdown(lesson.body)} variant="read" className="mt-8" />
      <Link href="/free" className="mt-10 inline-block font-semibold text-primary underline underline-offset-4">
        Выбрать следующий бесплатный урок
      </Link>
    </article>
  );
}
