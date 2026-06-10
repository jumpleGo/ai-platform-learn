'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { invalidateCatalog } from '@/lib/db/courses';
import { requireAdmin } from '@/lib/require-admin';
import type { Access } from '@/lib/types';

function assertId(id: string, name: string) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`invalid ${name}`);
}

function parseAccess(value: FormDataEntryValue | null): Access {
  return value === 'paid' ? 'paid' : 'free';
}

// Общие поля урока для create/update с одинаковой валидацией
function parseLessonFields(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('title required');
  const videoEmbedUrl = String(formData.get('videoEmbedUrl') ?? '').trim();
  if (!videoEmbedUrl) throw new Error('videoEmbedUrl required');
  if (!videoEmbedUrl.startsWith('https://')) throw new Error('videoEmbedUrl must be https');
  const durationRaw = String(formData.get('durationSec') ?? '').trim();
  const durationNum = Number(durationRaw);
  return {
    title,
    description: String(formData.get('description') ?? '').trim(),
    videoEmbedUrl,
    durationSec: durationRaw === '' || !Number.isFinite(durationNum) ? null : durationNum,
    access: parseAccess(formData.get('access')),
  };
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
  const count = await adminDb.collection('courses').count().get();
  const ref = await adminDb.collection('courses').add({
    title,
    description: String(formData.get('description') ?? '').trim(),
    access: parseAccess(formData.get('access')),
    order: count.data().count,
    published: false,
    coverUrl: null,
  });
  refreshCourses();
  redirect(`/admin/courses/${ref.id}`);
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('title required');
  await adminDb.doc(`courses/${courseId}`).update({
    title,
    description: String(formData.get('description') ?? '').trim(),
    access: parseAccess(formData.get('access')),
    published: formData.get('published') === 'on',
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
  const fields = parseLessonFields(formData);
  const lessons = adminDb.collection(`courses/${courseId}/lessons`);
  const count = await lessons.count().get();
  await lessons.add({ ...fields, order: count.data().count });
  refreshCourses(courseId);
}

export async function updateLesson(courseId: string, lessonId: string, formData: FormData) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  assertId(lessonId, 'lessonId');
  await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).update(parseLessonFields(formData));
  refreshCourses(courseId);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await requireAdmin();
  assertId(courseId, 'courseId');
  assertId(lessonId, 'lessonId');
  await adminDb.doc(`courses/${courseId}/lessons/${lessonId}`).delete();
  refreshCourses(courseId);
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
