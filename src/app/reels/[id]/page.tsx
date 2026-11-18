import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { GelatoLogo } from '@/components/gelato-logo';
import { ReelLocalActions, ReelLocalLikesProvider } from '@/components/reels/reel-local-actions';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';
import { ReelsDesktopFeed } from '@/components/reels/reels-desktop-feed';
import { ReelCourseLink } from '@/components/reels/reel-course-link';
import { listPublishedReels } from '@/lib/db/reels';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
import { SITE_URL } from '@/lib/site';

// Publication state must be fresh on every request.
export const dynamic = 'force-dynamic';
export const viewport: Viewport = { viewportFit: 'cover' };

type Props = { params: Promise<{ id: string }> };
const loadReel = cache(async (id: string) => {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) notFound();
  // Uses the same publication, video and published-course checks as the feed.
  const reels = await listPublishedReels();
  const reel = reels.find((item) => item.id === id);
  if (!reel) notFound();

  const bucket = adminStorage.bucket(storageBucketName);
  const [metadata] = await bucket.file(reel.videoPath).getMetadata();
  const url = `${SITE_URL}/reels/${id}`;
  const video = `${url}/video`;
  const poster = `${url}/poster`;
  // Storage records the actual upload time, including for legacy reel documents.
  const uploadDate = metadata.timeCreated
    ? new Date(metadata.timeCreated).toISOString()
    : undefined;
  const items = reels.map((item) => ({
    reel: item,
    video: `${SITE_URL}/reels/${item.id}/video`,
    poster: `${SITE_URL}/reels/${item.id}/poster`,
  }));
  return { reel, video, poster, uploadDate, url, items };
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
  const { reel, video, poster, uploadDate, url, items } = await loadReel((await params).id);
  const schema = {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: reel.title, description: reel.description,
    thumbnailUrl: poster, uploadDate, contentUrl: video, embedUrl: url, url,
  };

  return (
    <ReelLocalLikesProvider>
    <div className="hidden h-[100dvh] min-h-svh flex-col bg-background md:flex [@media(pointer:coarse)_and_(max-height:767px)]:hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }} />
      <header className="shrink-0 border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="GELATO, на главную">
            <GelatoLogo className="h-9 sm:h-11" />
          </Link>
          <Link href="/reels" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Все короткие видео
          </Link>
        </div>
      </header>
      <ReelsDesktopFeed items={items} initialReelId={reel.id}>
        {items.map(({ reel: feedReel, video: feedVideo, poster: feedPoster }, position) => {
          const Heading = feedReel.id === reel.id ? 'h1' : 'h2';
          return (
            <section key={feedReel.id} data-reel-id={feedReel.id}
              className="flex h-full min-h-[calc(100dvh-3.5rem)] w-full snap-start snap-always items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
              <article className="mx-auto grid w-full max-w-5xl items-center gap-6 sm:grid-cols-2 sm:gap-10">
                <div className="relative mx-auto aspect-[9/16] max-h-[70svh] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
                  <video
                  className="h-full w-full object-contain"
                  src={feedVideo} poster={feedPoster} preload="none" controls playsInline muted
                  aria-label={feedReel.title}
                />
                  <div data-reel-actions className="absolute right-3 bottom-36 z-20">
                    <ReelLocalActions eventProps={{ reel_id: feedReel.id, course_slug: feedReel.courseSlug || null, position }} />
                  </div>
                  <div className="absolute inset-x-0 bottom-10 z-20 bg-gradient-to-t from-black/90 to-transparent p-4 pt-8">
                    <ReelCourseLink reel={feedReel} eventProps={{ reel_id: feedReel.id, course_slug: feedReel.courseSlug || null, position }} />
                  </div>
                </div>
                <div className="min-w-0 space-y-5">
                  <Heading className="break-words text-2xl font-bold tracking-tight sm:text-4xl">{feedReel.title}</Heading>
                  {feedReel.description && <p className="whitespace-pre-line break-words text-base text-muted-foreground sm:text-lg">{feedReel.description}</p>}
                </div>
              </article>
            </section>
          );
        })}
      </ReelsDesktopFeed>
    </div>
    <ReelsMobileFeed items={items} initialReelId={reel.id} exitHref="/reels" localLikes />
    </ReelLocalLikesProvider>
  );
}
