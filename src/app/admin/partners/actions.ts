'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { deletePartner, invalidatePartners, savePartner } from '@/lib/db/partners';

function assertId(id: string) {
  if (!/^[\w-]+$/.test(id)) throw new Error('invalid partner id');
}

function refreshPartners() {
  invalidatePartners();
  revalidatePath('/admin/partners');
}

export async function savePartnerAction(id: string | null, formData: FormData) {
  await requireAdmin();
  if (id !== null) assertId(id);
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Название обязательно');
  const slug = String(formData.get('slug') ?? '').trim();
  if (!slug) throw new Error('Slug обязателен');
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug: только строчные латинские буквы, цифры и дефис');
  }
  const logoUrl = String(formData.get('logoUrl') ?? '').trim();
  if (logoUrl && !logoUrl.startsWith('https://')) {
    throw new Error('Ссылка на логотип должна начинаться с https://');
  }
  const brandColor = String(formData.get('brandColor') ?? '').trim();
  if (brandColor && !/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    throw new Error('Цвет бренда должен быть в формате #rrggbb');
  }
  await savePartner(id, {
    name,
    slug,
    logoUrl: logoUrl || null,
    brandColor: brandColor || null,
    active: formData.get('active') === 'on',
  });
  refreshPartners();
}

export async function deletePartnerAction(id: string) {
  await requireAdmin();
  assertId(id);
  await deletePartner(id);
  refreshPartners();
}
