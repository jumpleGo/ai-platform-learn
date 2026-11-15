// Разбор контакта из формы «оставь Telegram». Одно поле на оба типа: пользователь
// пишет как привык (@ник, t.me/ник или почту), а в базу уходит нормализованная строка
// и тип — по нему видно, куда писать. Модуль без 'server-only': валидация нужна и на
// клиенте (подсказка до отправки), и на сервере (защита от мусора).

export type LeadContactType = 'telegram' | 'email';
export type LeadContact = { contact: string; type: LeadContactType };

// Жёсткий верхний предел на сырой ввод — всё длиннее точно мусор
export const LEAD_CONTACT_MAX = 120;

// Ник Telegram: 5–32 символа, латиница, цифры, подчёркивание, первый — буква
const TG_USERNAME_RE = /^[a-z][a-z0-9_]{4,31}$/i;
// Почта: без экзотики, но с обязательной точкой в домене
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseLeadContact(raw: string): LeadContact | null {
  const value = raw.trim();
  if (!value || value.length > LEAD_CONTACT_MAX) return null;

  if (value.includes('@') && !value.startsWith('@') && EMAIL_RE.test(value)) {
    return { contact: value.toLowerCase(), type: 'email' };
  }

  // Снимаем обёртки: @ник, t.me/ник, https://t.me/ник, telegram.me/ник
  const username = value
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?(t|telegram)\.me\//i, '')
    .replace(/^@/, '')
    .replace(/\/$/, '');
  if (TG_USERNAME_RE.test(username)) return { contact: `@${username}`, type: 'telegram' };

  return null;
}
