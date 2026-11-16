import type { Metadata } from 'next';
import Link from 'next/link';
import { GelatoLogo } from '@/components/gelato-logo';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';
import { listPublishedReels } from '@/lib/db/reels';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
import { ReelActions } from '@/components/reels/reel-actions';
import { ReelLikesProvider } from '@/components/reels/reel-likes-provider';

export const metadata: Metadata = {
  title: 'Короткие видео про ИИ — GELATO',
  description: 'Короткие видео про работу с ИИ: смотрите ролик и переходите сразу в курс по теме.',
  alternates: { canonical: '/reels' },
};

// Лента строится по данным Firestore и подписанным ссылкам, на сборке их нет
export const dynamic = 'force-dynamic';

const LINK_TTL_MS = 60 * 60 * 1000;
// Постер необязателен: без него показываем значок сайта, чтобы кадр не был пустым
const FALLBACK_POSTER = '/icon.svg';

async function signRead(path: string): Promise<string> {
  const [url] = await adminStorage
    .bucket(storageBucketName)
    .file(path)
    .getSignedUrl({ action: 'read', expires: Date.now() + LINK_TTL_MS });
  return url;
}

export default async function ReelsPage() {
  const reels = await listPublishedReels();
  const items = await Promise.all(
    reels.map(async (reel) => ({
      reel,
      video: await signRead(reel.videoPath),
      poster: reel.posterPath ? await signRead(reel.posterPath) : FALLBACK_POSTER,
    })),
  );

  return (
    <ReelLikesProvider>
      <div className={`flex min-h-svh flex-col bg-background ${items.length > 0 ? 'hidden md:flex' : ''}`}>
        <header className="shrink-0 border-b border-border/70">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="GELATO, на главную">
              <GelatoLogo className="h-9 sm:h-11" />
            </Link>
            <Link href="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Курсы
            </Link>
          </div>
        </header>
        {items.length === 0 ? (
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
            <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-4xl">Короткие видео про ИИ</h1>
            <section className="rounded-2xl border border-border p-6 text-center sm:p-10">
              <p className="text-lg font-semibold">Первые короткие видео скоро появятся</p>
              <p className="mt-2 text-muted-foreground">
                А пока можно познакомиться с ИИ на наших курсах.
              </p>
              <Link
                href="/courses"
                className="mt-5 inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
              >
                Смотреть курсы
              </Link>
            </section>
          </main>
        ) : (
          <main
            data-reel-feed="desktop"
            className="flex-1 overflow-y-scroll snap-y snap-mandatory h-[calc(100svh-3.5rem)]"
          >
            <h1 className="sr-only">Короткие видео про ИИ</h1>
            {items.map(({ reel, video, poster }, position) => (
              <article
                key={reel.id}
                data-reel-id={reel.id}
                className="flex h-full min-h-[calc(100svh-3.5rem)] w-full snap-start snap-always items-center justify-center p-4 lg:p-8"
              >
                <div className="flex items-center justify-center gap-6 lg:gap-8 max-h-[calc(100svh-5rem)]">
                  <div className="aspect-[9/16] h-[calc(100svh-6rem)] max-h-[750px] shrink-0 overflow-hidden rounded-2xl bg-black shadow-lg">
                    <video
                      className="h-full w-full object-cover"
                      src={video}
                      poster={poster}
                      preload="none"
                      controls
                      playsInline
                    />
                  </div>
                  <div
                    data-reel-column="right"
                    className="flex flex-col justify-between w-72 sm:w-80 h-[calc(100svh-6rem)] max-h-[750px] py-2"
                  >
                    <div className="flex items-start">
                      <ReelActions
                        eventProps={{ reel_id: reel.id, course_slug: reel.courseSlug || null, position }}
                        initialLikeCount={reel.likeCount ?? 0}
                        layout="desktop"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground line-clamp-2">
                          {reel.title}
                        </h2>
                        {reel.description && (
                          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line line-clamp-6">
                            {reel.description}
                          </p>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/courses/${reel.courseSlug}`}
                          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Перейти в курс
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </main>
        )}
      </div>
      {items.length > 0 && <ReelsMobileFeed items={items} />}
    </ReelLikesProvider>
  );
}
