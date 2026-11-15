import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { GelatoLogo } from '@/components/gelato-logo';
import { ReelShareButton } from '@/components/reels/reel-share-button';
import { listPublishedReels } from '@/lib/db/reels';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
import { SITE_URL } from '@/lib/site';

// Publication state and signed media URLs must be fresh on every request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };
const LINK_TTL_MS = 60 * 60 * 1000;

const loadReel = cache(async (id: string) => {
  if (!/^[\w-]{1,128}$/.test(id)) notFound();
  // Uses the same publication, video and published-course checks as the feed.
  const reel = (await listPublishedReels()).find((item) => item.id === id);
  if (!reel) notFound();

  const bucket = adminStorage.bucket(storageBucketName);
  const options = { action: 'read' as const, expires: Date.now() + LINK_TTL_MS };
  const [[video], poster, [metadata]] = await Promise.all([
    bucket.file(reel.videoPath).getSignedUrl(options),
    reel.posterPath
      ? bucket.file(reel.posterPath).getSignedUrl(options).then(([url]) => url)
      : Promise.resolve(`${SITE_URL}/og-gelato.png`),
    bucket.file(reel.videoPath).getMetadata(),
  ]);
  // Storage records the actual upload time, including for legacy reel documents.
  const uploadDate = metadata.timeCreated
    ? new Date(metadata.timeCreated).toISOString()
    : undefined;
  return { reel, video, poster, uploadDate, url: `${SITE_URL}/reels/${id}` };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reel, poster, url } = await loadReel((await params).id);
  return {
    title: reel.title,
    description: reel.description,
    alternates: { canonical: `/reels/${reel.id}` },
    openGraph: {
      type: 'video.other', title: reel.title, description: reel.description,
      url, siteName: 'GELATO', locale: 'ru_RU',
      images: [{ url: poster, alt: reel.title }],
    },
    twitter: {
      card: 'summary_large_image', title: reel.title,
      description: reel.description, images: [poster],
    },
  };
}

export default async function ReelPage({ params }: Props) {
  const { reel, video, poster, uploadDate, url } = await loadReel((await params).id);
  const schema = {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: reel.title, description: reel.description,
    thumbnailUrl: poster, uploadDate, contentUrl: video, url,
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }} />
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="GELATO, на главную">
            <GelatoLogo className="h-9 sm:h-11" />
          </Link>
          <Link href="/reels" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Все короткие видео
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <article className="grid items-center gap-6 sm:grid-cols-2 sm:gap-10">
          <video
            className="mx-auto aspect-[9/16] max-h-[70svh] w-full max-w-sm rounded-2xl bg-black object-contain"
            src={video} poster={poster} preload="metadata" controls playsInline
            aria-label={reel.title}
          />
          <div className="min-w-0 space-y-5">
            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-4xl">{reel.title}</h1>
            {reel.description && <p className="whitespace-pre-line break-words text-base text-muted-foreground sm:text-lg">{reel.description}</p>}
            <div className="flex flex-wrap items-start gap-3">
              <Link href={reel.ctaHref} className="inline-flex min-h-11 items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
                {reel.ctaLabel}
              </Link>
              <ReelShareButton url={url} title={reel.title} text={reel.description} />
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
