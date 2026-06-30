import 'server-only';
import { randomUUID } from 'crypto';
import { adminStorage, storageBucketName } from '@/lib/firebase/admin';

const MAX_BYTES = 5 * 1024 * 1024; // 5 МБ
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']);
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

// Загружает превью урока в Firebase Storage и возвращает публичную download-ссылку.
// Используется download-token — работает и при uniform bucket-level access, без публичного бакета.
export async function uploadPreview(file: File, courseId: string): Promise<string> {
  if (!ALLOWED.has(file.type)) throw new Error('Поддерживаются только изображения PNG, JPEG, WebP, AVIF, GIF');
  if (file.size > MAX_BYTES) throw new Error('Файл больше 5 МБ');

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `previews/${courseId}/${Date.now()}-${randomUUID()}.${EXT[file.type]}`;
  const token = randomUUID();

  const bucket = adminStorage.bucket(storageBucketName);
  await bucket.file(objectPath).save(buffer, {
    contentType: file.type,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    objectPath,
  )}?alt=media&token=${token}`;
}
