// Единая точка правды по структуре публичного сайта: навигация, внешние ссылки,
// разделение курсов на «бесплатные материалы» и «обучения».
// Модуль без 'server-only' — используется и в клиентских компонентах.

export const SITE_URL = 'https://gelato.education';

// Личка — сюда ведут все кнопки «написать»: продажи идут через диалог, не через корзину
export const TELEGRAM_DM = 'https://t.me/gelato_ai';
// Канал школы: анонсы, бесплатные разборы. Поменять на реальный хендл канала,
// пока стоит та же ссылка, что и в личку — чтобы не вести в пустоту.
export const TELEGRAM_CHANNEL = 'https://t.me/gelato_ai';
// Внешний лендинг оплаты вайбкодинга — пока основная точка приёма денег
export const PROGRAM_URL = 'https://vibe.gelato.education';

// Курс-хаб бесплатных материалов: его уроки не продаются, а работают входом
// в воронку. В витрине «Наши обучения» он не участвует.
export const FREE_HUB_SLUGS: readonly string[] = ['claude-code'];

export function isFreeHub(course: { slug?: string | null; id: string }): boolean {
  return FREE_HUB_SLUGS.includes(course.slug ?? course.id);
}

export type NavItem = { href: string; label: string };

// Шапка. «О нас» — якорь на главной: рассказ о школе живёт там же, где первый контакт.
export const NAV: readonly NavItem[] = [
  { href: '/#about', label: 'О нас' },
  { href: '/free', label: 'Бесплатные материалы' },
  { href: '/courses', label: 'Наши обучения' },
  { href: '/faq', label: 'Вопрос-ответ' },
];

// Витрина уроков живёт на главной — вошедшему нужен видимый способ вернуться
// к ней с любой страницы. Гостю пункт не показываем: показывать нечего.
export const LEARNING_HREF = '/#learning';

export function navItems(authed: boolean): readonly NavItem[] {
  return authed ? [{ href: LEARNING_HREF, label: 'Моё обучение' }, ...NAV] : NAV;
}

export const LEGAL_NAV: readonly NavItem[] = [
  { href: '/legal/offer', label: 'Оферта' },
  { href: '/legal/privacy', label: 'Политика конфиденциальности' },
];

// Активный пункт шапки. Якоря главной не подсвечиваем: их несколько,
// и на '/' загорелись бы сразу все — подчёркивание перестаёт что-либо значить.
export function isNavActive(href: string, pathname: string): boolean {
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
