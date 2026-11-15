import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import type { Lead } from '@/lib/types';

// Лиды с лендингов: контакт тех, кто не готов платить сейчас. Пишем только через admin SDK
export async function createLead(data: Omit<Lead, 'id'>) {
  await adminDb.collection('leads').add(data);
}

// Без кэша — админка всегда показывает свежие данные. Один orderBy — single-field index
export async function listLeads(limit = 200): Promise<Lead[]> {
  const snap = await adminDb.collection('leads').orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Lead, 'id'>) }));
}
