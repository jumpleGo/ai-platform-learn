import 'server-only';
import { adminDb, adminStorage, storageBucketName } from '@/lib/firebase/admin';
import type { Reel } from '@/lib/reels';

type ReelData = Omit<Reel, 'id'>;
function project(id: string, data: ReelData): Reel {
  const { title, courseSlug, videoPath, posterPath, order, published } = data;
  return { id, title, courseSlug, videoPath, order, published, ...(posterPath ? { posterPath } : {}) };
}
const reels = () => adminDb.collection('reels');
async function publishedSlugs() {
  const snap = await adminDb.collection('courses').where('published', '==', true).get();
  return new Set(snap.docs.filter((d) => d.data().published === true).map((d) => d.data().slug));
}

type ReelMetadata = Pick<Reel, 'title' | 'courseSlug' | 'order'>;
async function validateMetadata({ title: rawTitle, courseSlug, order }: ReelMetadata): Promise<ReelMetadata> {
  const title = rawTitle.trim();
  if (!title || title.length > 120 || !/^[a-z0-9-]+$/.test(courseSlug)
    || !Number.isSafeInteger(order) || order < 0) throw new Error('Invalid reel metadata');
  if (!(await publishedSlugs()).has(courseSlug)) throw new Error('Course is not published');
  return { title, courseSlug, order };
}

// Guard callers with requireAdmin.
export async function createReel(metadata: ReelMetadata): Promise<string> {
  const data = await validateMetadata(metadata);
  const doc = await reels().add({ ...data, videoPath: '', published: false });
  return doc.id;
}

export async function updateReelMetadata(id: string, metadata: ReelMetadata): Promise<void> {
  if (!/^[\w-]{1,128}$/.test(id)) throw new Error('Invalid reel ID');
  const data = await validateMetadata(metadata);
  await reels().doc(id).update(data);
}

export async function listAllReels(): Promise<Reel[]> {
  const snap = await reels().get();
  return snap.docs.map((d) => project(d.id, d.data() as ReelData))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export async function listReelCourses(): Promise<Array<{ slug: string; title: string }>> {
  const snap = await adminDb.collection('courses').where('published', '==', true).get();
  return snap.docs.map((d) => d.data()).filter((d) => d.published === true && typeof d.slug === 'string')
    .map((d) => ({ slug: d.slug as string, title: d.title as string }));
}

export async function getReel(id: string): Promise<Reel | null> {
  const doc = await reels().doc(id).get();
  return doc.exists ? project(doc.id, doc.data() as ReelData) : null;
}

export async function listPublishedReels(): Promise<Reel[]> {
  const [snap, slugs] = await Promise.all([
    reels().where('published', '==', true).get(), publishedSlugs(),
  ]);
  return snap.docs.map((d) => project(d.id, d.data() as ReelData))
    .filter((r) => r.published === true && r.videoPath && slugs.has(r.courseSlug))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export async function setReelVideoPath(id: string, videoPath: string): Promise<void> {
  const match = /^reels\/([\w-]+)\/[a-f0-9-]{36}\.(mp4|mov)$/.exec(videoPath);
  if (!match || match[1] !== id) throw new Error('Invalid reel video path');
  await reels().doc(id).update({ videoPath, published: false });
}

export class ReelMutationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function requireReel(id: string): Promise<Reel> {
  if (!/^[\w-]{1,128}$/.test(id)) throw new ReelMutationError(400, 'Некорректный идентификатор рилса.');
  const reel = await getReel(id);
  if (!reel) throw new ReelMutationError(404, 'Рилс не найден.');
  return reel;
}

// Guard callers with the existing requireAdmin, just like the upload endpoint.
export async function setReelPublished(id: string, published: boolean): Promise<void> {
  const reel = await requireReel(id);
  if (published) {
    if (typeof reel.videoPath !== 'string' || !reel.videoPath.trim()) {
      throw new ReelMutationError(400, 'Сначала загрузите видео, затем опубликуйте рилс.');
    }
    if (!(await publishedSlugs()).has(reel.courseSlug)) {
      throw new ReelMutationError(400, 'Курс рилса не опубликован. Сначала опубликуйте курс.');
    }
  }
  await reels().doc(id).update({ published });
}

export async function deleteReel(id: string): Promise<void> {
  const reel = await requireReel(id);
  if (reel.videoPath) {
    // Match upload ownership: never delete another reel's file or a course video.
    const match = /^reels\/([\w-]+)\/[a-f0-9-]{36}\.(mp4|mov)$/.exec(reel.videoPath);
    if (match?.[1] !== id) {
      throw new ReelMutationError(409, 'Не удалось удалить рилс: путь видео не принадлежит этому рилсу.');
    }
    await adminStorage.bucket(storageBucketName).file(reel.videoPath).delete({ ignoreNotFound: true });
  }
  // Keep the document if Storage fails, so the admin can retry cleanup.
  await reels().doc(id).delete();
}
