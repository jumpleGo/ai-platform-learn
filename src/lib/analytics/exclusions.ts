// Где аналитику не собираем: локальная разработка и админка.
// Общее место для обеих систем — PostHog и Яндекс.Метрики.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return LOCAL_HOSTS.has(h) || h.endsWith('.local');
}

export function isAdminPath(pathname?: string): boolean {
  const p = pathname ?? (typeof window === 'undefined' ? '' : window.location.pathname);
  return p === '/admin' || p.startsWith('/admin/');
}

// Аналитику вообще не поднимаем — проверяется один раз при инициализации
export function isTrackingDisabled(): boolean {
  return isLocalHost() || isAdminPath();
}
