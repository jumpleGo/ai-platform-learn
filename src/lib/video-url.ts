// Чистая функция — без server-only, нужна и в тестах

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export function toEmbedUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  // Только https — режем javascript:, data: и прочие опасные схемы
  if (parsed.protocol !== 'https:') return 'about:blank';

  if (YOUTUBE_HOSTS.has(parsed.hostname)) {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
    return url;
  }

  if (parsed.hostname === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  }

  return url;
}

// Достаёт id ролика из любого формата YouTube-ссылки (watch / youtu.be / shorts / embed).
// null — если это не YouTube (тогда превью-карточка покажет запасной вид)
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  if (parsed.hostname === 'youtu.be') {
    return parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  }
  if (YOUTUBE_HOSTS.has(parsed.hostname) || parsed.hostname === 'www.youtube-nocookie.com') {
    if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
    const m = parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
    if (m) return m[1];
  }
  return null;
}

// Ссылка для основного плеера: максимально чистый YouTube — без аннотаций,
// со скрытым брендингом и минимумом рекомендаций (rel=0 — только тот же канал).
export function playerEmbedUrl(url: string): string {
  const base = toEmbedUrl(url);
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return base;
  }
  if (!parsed.hostname.includes('youtube')) return base;
  parsed.searchParams.set('rel', '0');
  parsed.searchParams.set('modestbranding', '1');
  parsed.searchParams.set('iv_load_policy', '3'); // без аннотаций
  parsed.searchParams.set('playsinline', '1');
  parsed.searchParams.set('color', 'white');
  return parsed.toString();
}

// Превью-кадр ролика. hqdefault есть всегда (в отличие от maxresdefault)
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
