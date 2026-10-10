'use server';
import { cookies } from 'next/headers';
import { incrementTestCourseClick } from '@/lib/db/stats';
import { createLead } from '@/lib/db/leads';
import { resolveAttribution } from '@/lib/attribution';
import { LEAD_CONTACT_MAX, parseLeadContact } from '@/lib/leads';

// Инкремент кликов по тестовому курсу (маркетинговый эксперимент на спрос).
// Публичный экшен — вызывается с любой карточки урока тестового курса, без авторизации.
export async function trackTestCourseClick(courseId: string) {
  await incrementTestCourseClick(courseId);
}

export type LeadSubmitResult =
  | { ok: true; type: 'telegram' | 'email' }
  | { ok: false; error: string };

// Лид с лендинга: «оставь Telegram — пришлю программу». Публичный экшен без авторизации,
// поэтому всё, что пришло, проверяем заново: формат контакта, длины, honeypot.
export async function submitLeadAction(formData: FormData): Promise<LeadSubmitResult> {
  // Скрытое поле: человек его не видит, бот заполняет. Отвечаем «ок», чтобы не подсказывать
  if (String(formData.get('website') ?? '')) return { ok: true, type: 'telegram' };

  const raw = String(formData.get('contact') ?? '');
  if (raw.length > LEAD_CONTACT_MAX) return { ok: false, error: 'Слишком длинно — нужен только ник или почта' };
  const parsed = parseLeadContact(raw);
  if (!parsed) return { ok: false, error: 'Напишите ник в Telegram (@username) или почту' };
  if (formData.get('consent') !== 'on') return { ok: false, error: 'Нужно согласие на обработку данных' };

  const courseSlug = String(formData.get('courseSlug') ?? '');
  const place = String(formData.get('place') ?? '');
  if (!/^[\w-]{1,64}$/.test(courseSlug) || !/^[\w-]{1,64}$/.test(place)) {
    return { ok: false, error: 'Не удалось отправить, попробуйте ещё раз' };
  }
  const fromRaw = String(formData.get('fromLanding') ?? '').slice(0, 64);
  const fromLanding = /^[\w-]+$/.test(fromRaw) ? fromRaw : null;

  const jar = await cookies();
  const { utm } = resolveAttribution({ partner: null, utm: jar.get('utm')?.value ?? null });

  await createLead({
    contact: parsed.contact,
    type: parsed.type,
    courseSlug,
    place,
    utm,
    fromLanding,
    createdAt: Date.now(),
  });
  return { ok: true, type: parsed.type };
}
