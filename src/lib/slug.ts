// Человекочитаемые адреса курсов и уроков: /courses/<slug>/lessons/<номер>.
// Модуль без 'server-only' — используется и в клиентских компонентах (ссылки на карточках).

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

const MAX_SLUG = 60;

// «Основы Claude Code» → «osnovy-claude-code»
export function slugify(input: string): string {
  const translit = input
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => TRANSLIT[ch] ?? '');
  const slug = translit
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= MAX_SLUG) return slug;
  // обрезаем по границе слова, чтобы не оставлять обрубок
  const cut = slug.slice(0, MAX_SLUG);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

// Ключ курса для URL. У курсов, созданных до появления slug, его может не быть —
// тогда в адрес идёт id документа (старое поведение), пока slug не заполнен.
export function courseKey(course: { slug?: string | null; id: string }): string {
  return course.slug || course.id;
}

export function lessonPath(key: string, number: number): string {
  return `/courses/${key}/lessons/${number}`;
}

export function waitlistPath(key: string): string {
  return `/waitlist/${key}`;
}

// Номер урока из URL: только «1», «2», … (без ведущих нулей и мусора)
export function parseLessonNumber(value: string): number | null {
  if (!/^[1-9][0-9]{0,3}$/.test(value)) return null;
  return Number(value);
}
