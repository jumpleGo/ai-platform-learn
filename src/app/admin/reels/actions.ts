'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { createReel, updateReelMetadata } from '@/lib/db/reels';
import { REEL_TEXT_FIELDS, type ReelMetadata } from '@/lib/reels';

export async function saveReelAction(id: string | null, formData: FormData): Promise<string> {
  await requireAdmin();
  const courseSlug = formData.get('courseSlug');
  const rawOrder = formData.get('order');
  if (typeof courseSlug !== 'string' || !/^[a-z0-9-]+$/.test(courseSlug)
    || typeof rawOrder !== 'string' || !/^\d+$/.test(rawOrder)
    || !Number.isSafeInteger(Number(rawOrder))) throw new Error('Проверьте курс и порядок.');
  const metadata: ReelMetadata = { courseSlug, order: Number(rawOrder) };
  for (const field of REEL_TEXT_FIELDS) {
    const value = formData.get(field);
    if (value !== null && typeof value !== 'string') throw new Error('Поля рилса должны содержать текст.');
    if (typeof value === 'string' && value.trim()) metadata[field] = value.trim();
  }
  if (id !== null) {
    if (!/^[\w-]{1,128}$/.test(id)) throw new Error('Invalid reel ID');
    await updateReelMetadata(id, metadata);
  } else {
    id = await createReel(metadata);
  }
  revalidatePath('/admin/reels');
  return id;
}
