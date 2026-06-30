import 'server-only';
import { youtubeId } from '@/lib/video-url';

// ISO8601 (PT1M30S) → секунды
function parseIso8601(d: string): number | null {
  const m = d.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
}

// Длительность ролика в секундах без ручного ввода.
// С YOUTUBE_API_KEY — через Data API; иначе — из страницы watch (поле lengthSeconds).
export async function fetchVideoDuration(url: string): Promise<number | null> {
  const id = youtubeId(url);
  if (!id) return null;
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (key) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${id}&key=${key}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { items?: { contentDetails?: { duration?: string } }[] };
      const iso = data.items?.[0]?.contentDetails?.duration;
      return iso ? parseIso8601(iso) : null;
    }
    // запасной путь без ключа: вытаскиваем lengthSeconds из HTML
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'Accept-Language': 'en-US' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"lengthSeconds":"(\d+)"/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
