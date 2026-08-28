'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { invalidateCatalog } from '@/lib/db/courses';
import { requireAdmin } from '@/lib/require-admin';
import { uploadPreview } from '@/lib/storage';
import { fetchVideoDuration } from '@/lib/video-meta';
import { slugify } from '@/lib/slug';
import { formatMaterials } from '@/lib/ai';
import { resetLessonBannerStats } from '@/lib/db/banner-stats';
import { DEFAULT_WEIGHT, VARIANT_IDS } from '@/lib/banners';
import type { Access, LessonBanner } from '@/lib/types';

function assertId(id: string, name: string) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`invalid ${name}`);
}

// Уникальный slug курса: если такой уже занят другим курсом — добавляем суффикс -2, -3, …
async function uniqueSlug(base: string, exceptCourseId?: string): Promise<string> {
  const root = slugify(base) || 'kurs';
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const snap = await adminDb.collection('courses').where('slug', '==', candidate).get();
    if (snap.docs.every((d) => d.id === exceptCourseId)) return candidate;
  }
  throw new Error('slug занят');
}

function parseAccess(value: FormDataEntryValue | null): Access {
  return value === 'paid' ? 'paid' : 'free';
}

// У тестового курса уроки витринные — видео к ним может не быть вовсе
async function isTestCourse(courseId: string) {
  const snap = await adminDb.doc(`courses/${courseId}`).get();
  return snap.get('isTest') === true;
}

// Варианты маркетингового блока из формы: 4 фиксированных слота A–D, пустой html
// означает «варианта нет». Вес пустой — DEFAULT_WEIGHT, 0 — вариант выключен.
function parseVariants(formData: FormData, prefix: 'materials' | 'related'): LessonBanner[] {
  return VARIANT_IDS.map((id) => {
    const html = String(formData.get(`${prefix}_${id}_html`) ?? '').trim();
    const name = String(formData.get(`${prefix}_${id}_name`) ?? '').trim();
    const weightRaw = String(formData.get(`${prefix}_${id}_weight`) ?? '').trim();
    const weightNum = Number(weightRaw);
    const weight = weightRaw === '' || !Number.isFinite(weightNum)
      ? DEFAULT_WEIGHT
      : Math.min(1000, Math.max(0, Math.round(weightNum)));
    return { id, name: name || `Вариант ${id.toUpperCase()}`, html, weight };
  }).filter((v) => v.html !== '');
}

// Общие поля урока для create/update с одинаковой валидацией
function parseLessonFields(formData: FormData, videoRequired: boolean) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('title required');
  const videoEmbedUrl = String(formData.get('videoEmbedUrl') ?? '').trim();
  if (!videoEmbedUrl && videoRequired) throw new Error('videoEmbedUrl required');
  if (videoEmbedUrl && !videoEmbedUrl.startsWith('https://')) throw new Error('videoEmbedUrl must be https');
  const durationRaw = String(formData.get('durationSec') ?? '').trim();
  const durationNum = Number(durationRaw);
  return {
    title,
    description: String(formData.get('description') ?? '').trim(),
    videoEmbedUrl,
    durationSec: durationRaw === '' || !Number.isFinite(durationNum) ? null : durationNum,
    access: parseAccess(formData.get('access')),
    published: formData.get('published') === 'on',
    materials: String(formData.get('materials') ?? '').trim(),
    hideHeader: formData.get('hideHeader') === 'on',
    hideFooter: formData.get('hideFooter') === 'on',
    hideBackLink: formData.get('hideBackLink') === 'on',
    hideLessonsNav: formData.get('hideLessonsNav') === 'on',
    marketingVariants: parseVariants(formData, 'materials'),
    relatedVariants: parseVariants(formData, 'related'),
    // старые одиночные поля больше не используются — гасим, чтобы не читались как вариант A
    marketingHtml: null,
    relatedHtml: null,
  };
}

// Разбирает превью из формы: удаление, новый файл или без изменений.
// Возвращает поле для записи ({} — не трогать существующее значение).
async function resolvePreview(
  formData: FormData,
  courseId: string,
): Promise<{ previewImageUrl?: string | null }> {
  if (formData.get('removePreview') === 'on') return { previewImageUrl: null };
  const file = formData.get('previewImage');
  if (file instanceof File && file.size > 0) {
    return { previewImageUrl: await uploadPreview(file, courseId) };
  }
  return {};
}

// max(order) + 1, чтобы после удаления документов не появлялись дубли order
async function nextOrder(collectionPath: string) {
  const last = await adminDb.collection(collectionPath).orderBy('order', 'desc').limit(1).get();
  return (last.docs[0]?.data().order ?? -1) + 1;
}

function refreshCourses(courseId?: string) {
  invalidateCatalog();
  revalidatePath('/admin/courses');
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('title required');
  const ref = await adminDb.collection('courses').add({
    title,
    slug: await uniqueSlug(String(formData.get('slug') ?? '').trim() || title),
    description: String(formData.get('description') ?? '').trim(),
    access: parseAccess(formData.get('access')),
    order: await nextOrder('courses'),
    published: false,
    coverUrl: null,
    isTest: false,
    testToastMessage: null,
    testLandingHtml: null,
    showBadge: false,
    badgeText: null,
    highlightBackground: false,
    clickCount: 0,
  });
  refreshCourses();
  redirect(`/admin/courses/${ref.id}`);
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('title required');
  const testToastMessage = String(formData.get('testToastMessage') ?? '').trim();
  const testLandingHtml = String(formData.get('testLandingHtml') ?? '').trim();
  const badgeText = String(formData.get('badgeText') ?? '').trim();
  // slug пустой — пересобираем из названия
  const slug = await uniqueSlug(String(formData.get('slug') ?? '').trim() || title, courseId);
  await adminDb.doc(`courses/${courseId}`).update({
    title,
    slug,
    description: String(formData.get('description') ?? '').trim(),
    access: parseAccess(formData.get('access')),
    published: formData.get('published') === 'on',
    isTest: formData.get('isTest') === 'on',
    testToastMessage: testToastMessage || null,
    testLandingHtml: testLandingHtml || null,
    showBadge: formData.get('showBadge') === 'on',
    badgeText: badgeText || null,
    highlightBackground: formData.get('highlightBackground') === 'on',
  });
  refreshCourses(courseId);
}

export async function deleteCourse(courseId: string) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  // recursiveDelete удаляет и подколлекцию уроков
  await adminDb.recursiveDelete(adminDb.doc(`courses/${courseId}`));
  refreshCourses();
  redirect('/admin/courses');
}

export async function createLesson(courseId: string, formData: FormData) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  const fields = parseLessonFields(formData, !(await isTestCourse(courseId)));
  // длительность не указали — пробуем взять из видео
  if (fields.durationSec === null) fields.durationSec = await fetchVideoDuration(fields.videoEmbedUrl);
  const preview = await resolvePreview(formData, courseId);
  const lessonsPath = `courses/${courseId}/lessons`;
  await adminDb.collection(lessonsPath).add({
    ...fields,
    views: 0,
    previewImageUrl: preview.previewImageUrl ?? null,
    order: await nextOrder(lessonsPath),
  });
  refreshCourses(courseId);
}

export async function updateLesson(courseId: string, lessonId: string, formData: FormData) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  assertId(lessonId, 'lessonId');
  const fields = parseLessonFields(formData, !(await isTestCourse(courseId)));
  if (fields.durationSec === null) fields.durationSec = await fetchVideoDuration(fields.videoEmbedUrl);
  const preview = await resolvePreview(formData, courseId);
  await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).update({ ...fields, ...preview });
  refreshCourses(courseId);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  assertId(lessonId, 'lessonId');
  await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).delete();
  refreshCourses(courseId);
}

// Обнуляет счётчики A/B-теста баннеров урока — после замены баннеров старые
// показы смешивались бы с новыми
export async function resetBannerStats(courseId: string, lessonId: string) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  assertId(lessonId, 'lessonId');
  await resetLessonBannerStats(courseId, lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
}

// Меняет местами поле order документа с соседом по отсортированному списку
async function swapOrderWithNeighbor(
  collectionPath: string,
  docId: string,
  direction: 'up' | 'down',
) {
  const snap = await adminDb.collection(collectionPath).orderBy('order').get();
  const idx = snap.docs.findIndex((d) => d.id === docId);
  const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx === -1 || neighborIdx < 0 || neighborIdx >= snap.docs.length) return;
  const a = snap.docs[idx];
  const b = snap.docs[neighborIdx];
  const batch = adminDb.batch();
  batch.update(a.ref, { order: b.get('order') });
  batch.update(b.ref, { order: a.get('order') });
  await batch.commit();
}

export async function moveCourse(courseId: string, direction: 'up' | 'down') {
  await requireAdmin();
  assertId(courseId, 'courseId');
  await swapOrderWithNeighbor('courses', courseId, direction);
  refreshCourses();
}

export async function moveLesson(courseId: string, lessonId: string, direction: 'up' | 'down') {
  await requireAdmin();
  assertId(courseId, 'courseId');
  assertId(lessonId, 'lessonId');
  await swapOrderWithNeighbor(`courses/${courseId}/lessons`, lessonId, direction);
  refreshCourses(courseId);
}

// Оформляет черновой конспект в красивый markdown через ИИ. Возвращает результат клиенту
// (редактор подставляет его в поле «Материалы»), в базу ничего не пишет.
export async function formatMaterialsAction(raw: string): Promise<string> {
  await requireAdmin();
  return formatMaterials(raw);
}
