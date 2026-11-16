import 'server-only';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminStorage, storageBucketName } from '@/lib/firebase/admin';
import {
  isValidReelCtaHref, MAX_REEL_DESCRIPTION_LENGTH, normalizeReel, REEL_TEXT_FIELDS,
  type NormalizedReel, type Reel, type ReelMetadata,
} from '@/lib/reels';

type ReelData = Omit<Reel, 'id'>;
function project(id: string, data: ReelData): Reel {
  const { courseSlug, videoPath, posterPath, order, published, likeCount } = data;
  const reel: Reel = {
    id,
    courseSlug,
    videoPath,
    order,
    published,
    likeCount: typeof likeCount === 'number' && Number.isFinite(likeCount) && likeCount >= 0 ? likeCount : 0,
    ...(posterPath ? { posterPath } : {}),
  };
  for (const field of REEL_TEXT_FIELDS) {
    const value = data[field];
    if (typeof value === 'string' && value) reel[field] = value;
  }
  return reel;
}
const reels = () => adminDb.collection('reels');
async function publishedCourses() {
  const snap = await adminDb.collection('courses').where('published', '==', true).get();
  return new Map(snap.docs.map((d) => d.data())
    .filter((data) => data.published === true && typeof data.slug === 'string')
    .map((data) => [data.slug as string, {
      title: typeof data.title === 'string' ? data.title : data.slug as string,
      description: typeof data.description === 'string' ? data.description : undefined,
    }]));
}

async function validateMetadata(metadata: ReelMetadata): Promise<ReelMetadata> {
  const { courseSlug, order } = metadata;
  if (typeof courseSlug !== 'string' || !/^[a-z0-9-]+$/.test(courseSlug)
    || !Number.isSafeInteger(order) || order < 0) throw new Error('Invalid reel metadata');
  const data: ReelMetadata = { courseSlug, order };
  for (const field of REEL_TEXT_FIELDS) {
    const value = metadata[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid reel metadata');
    const text = value.trim();
    if (field === 'title' && text.length > 120) throw new Error('Заголовок рилса — не больше 120 символов.');
    if (field === 'description' && text.length > MAX_REEL_DESCRIPTION_LENGTH) {
      throw new Error('Описание рилса — не больше 300 символов.');
    }
    if (field === 'ctaHref' && !isValidReelCtaHref(text)) {
      throw new Error('Ссылка кнопки должна быть внутренним путём /… или адресом https://.');
    }
    data[field] = text;
  }
  if (!(await publishedCourses()).has(courseSlug)) throw new Error('Course is not published');
  return data;
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
  // A save replaces the editable metadata; omitted overrides restore defaults.
  const overrides = Object.fromEntries(REEL_TEXT_FIELDS.map((field) => [field, data[field] ?? FieldValue.delete()]));
  await reels().doc(id).update({ ...data, ...overrides });
}

export async function listAllReels(): Promise<Reel[]> {
  const snap = await reels().get();
  return snap.docs.map((d) => project(d.id, d.data() as ReelData))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export async function listReelCourses(): Promise<Array<{ slug: string; title: string }>> {
  return Array.from(await publishedCourses(), ([slug, course]) => ({ slug, title: course.title }));
}

export async function getReel(id: string): Promise<Reel | null> {
  const doc = await reels().doc(id).get();
  return doc.exists ? project(doc.id, doc.data() as ReelData) : null;
}

export async function listPublishedReels(): Promise<NormalizedReel[]> {
  const [snap, courses] = await Promise.all([
    reels().where('published', '==', true).get(), publishedCourses(),
  ]);
  return snap.docs.map((d) => project(d.id, d.data() as ReelData))
    .filter((r) => r.published === true && r.videoPath && courses.has(r.courseSlug))
    .map((r) => normalizeReel(r, courses.get(r.courseSlug)!))
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
    if (!(await publishedCourses()).has(reel.courseSlug)) {
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

export async function toggleReelLike(
  id: string,
  uid: string,
): Promise<{ liked: boolean; likeCount: number } | null> {
  if (!/^[\w-]{1,128}$/.test(id)) return null;
  const hashedUid = createHash('sha256').update(uid).digest('hex');
  const reelRef = reels().doc(id);
  const likeRef = reelRef.collection('likes').doc(hashedUid);

  return await adminDb.runTransaction(async (tx) => {
    const reelDoc = await tx.get(reelRef);
    if (!reelDoc.exists) return null;
    const reelData = reelDoc.data() as ReelData | undefined;
    if (reelData?.published !== true) return null;

    const currentLikes = typeof reelData?.likeCount === 'number' && Number.isFinite(reelData.likeCount) && reelData.likeCount > 0
      ? reelData.likeCount
      : 0;

    const likeDoc = await tx.get(likeRef);
    if (likeDoc.exists) {
      tx.delete(likeRef);
      const nextCount = Math.max(0, currentLikes - 1);
      tx.update(reelRef, { likeCount: nextCount });
      return { liked: false, likeCount: nextCount };
    } else {
      tx.set(likeRef, { createdAt: FieldValue.serverTimestamp(), uid });
      const nextCount = currentLikes + 1;
      tx.update(reelRef, { likeCount: nextCount });
      return { liked: true, likeCount: nextCount };
    }
  });
}
