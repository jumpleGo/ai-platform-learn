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
