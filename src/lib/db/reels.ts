import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
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
