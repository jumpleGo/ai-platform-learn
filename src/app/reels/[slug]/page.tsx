import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GelatoLogo } from '@/components/gelato-logo';
import { ReelPlayer } from '@/components/reels/reel-player';
import { getPublishedReel, getReelUploadDate } from '@/lib/reel-public';
import { reelPosterUrl, reelUrl } from '@/lib/reel-urls';

export const dynamic = 'force-dynamic';
export const viewport: Viewport = { viewportFit: 'cover' };
type Props = { params: Promise<{ slug: string }> };

async function requirePublishedReel(slug: string) {
  const reel = await getPublishedReel(slug);
  if (!reel) notFound();
  return reel;
}

const descriptionFor = (title: string) => `${title} — короткое видео про работу с ИИ на GELATO.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const reel = await requirePublishedReel((await params).slug);
  const title = `${reel.title} — GELATO`;
  const description = descriptionFor(reel.title);
  const url = reelUrl(reel.id);
  const image = reelPosterUrl(reel);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'video.other', title, description, url, siteName: 'GELATO', locale: 'ru_RU',
      videos: [{ url: `${url}/video`, type: reel.videoPath.endsWith('.mov') ? 'video/quicktime' : 'video/mp4' }],
      images: [{ url: image, alt: reel.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ReelPage({ params }: Props) {
  const reel = await requirePublishedReel((await params).slug);
  const url = reelUrl(reel.id);
  const poster = reelPosterUrl(reel);
  const uploadDate = await getReelUploadDate(reel.videoPath);
  const videoObject = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${url}#video`,
    name: reel.title,
    description: descriptionFor(reel.title),
    url,
    contentUrl: `${url}/video`,
    thumbnailUrl: poster,
    ...(uploadDate ? { uploadDate } : {}),
    publisher: { '@type': 'Organization', name: 'GELATO' },
  };
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="GELATO, на главную"><GelatoLogo className="h-9 sm:h-11" /></Link>
          <Link href="/reels" className="text-sm font-medium">Короткие видео</Link>
        </div>
      </header>
      <main className="px-4 py-6">
        <ReelPlayer title={reel.title} video={`${url}/video`} poster={poster} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObject).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
