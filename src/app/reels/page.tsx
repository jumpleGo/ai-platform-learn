import type { Metadata } from 'next';
import Link from 'next/link';
import { GelatoLogo } from '@/components/gelato-logo';
import { listPublishedReels } from '@/lib/db/reels';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';

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
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="GELATO, на главную">
            <GelatoLogo className="h-9 sm:h-11" />
          </Link>
          <Link href="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Курсы
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-4xl">Короткие видео про ИИ</h1>
        {items.length === 0 ? (
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
        ) : (
          <div className="mx-auto grid max-w-md grid-cols-1 gap-8 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ reel, video, poster }) => (
              <article key={reel.id} className="space-y-3">
                <video
                  className="aspect-[9/16] w-full rounded-2xl bg-black object-cover"
                  src={video}
                  poster={poster}
                  preload="none"
                  controls
                  playsInline
                />
                <h2 className="text-base font-semibold">{reel.title}</h2>
                <Link
                  href={`/courses/${reel.courseSlug}`}
                  className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Перейти в курс
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
