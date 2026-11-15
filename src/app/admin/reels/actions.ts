'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { createReel, updateReelMetadata } from '@/lib/db/reels';

export async function saveReelAction(id: string | null, formData: FormData): Promise<string> {
  await requireAdmin();
  const title = formData.get('title');
  const courseSlug = formData.get('courseSlug');
  const rawOrder = formData.get('order');
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120
    || typeof courseSlug !== 'string' || !/^[a-z0-9-]+$/.test(courseSlug)
    || typeof rawOrder !== 'string' || !/^\d+$/.test(rawOrder)
    || !Number.isSafeInteger(Number(rawOrder))) throw new Error('Проверьте заголовок, курс и порядок.');
  const metadata = { title: title.trim(), courseSlug, order: Number(rawOrder) };
  if (id !== null) {
    if (!/^[\w-]{1,128}$/.test(id)) throw new Error('Invalid reel ID');
    await updateReelMetadata(id, metadata);
  } else {
    id = await createReel(metadata);
  }
  revalidatePath('/admin/reels');
  return id;
}
