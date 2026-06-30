import { describe, it, expect } from 'vitest';
import { toEmbedUrl, youtubeId, playerEmbedUrl } from '@/lib/video-url';

describe('toEmbedUrl', () => {
  it('youtube watch -> embed', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('youtu.be -> embed', () => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=10'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('youtube shorts -> embed', () => {
    expect(toEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('уже embed-ссылка YouTube остаётся как есть', () => {
    expect(toEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });
  it('прочие хостинги (Kinescope/Mux) — без изменений', () => {
    expect(toEmbedUrl('https://kinescope.io/embed/abc123'))
      .toBe('https://kinescope.io/embed/abc123');
  });
  it('кривой URL — без изменений', () => {
    expect(toEmbedUrl('not-a-url')).toBe('not-a-url');
  });
  it('не-https схема -> about:blank', () => {
    expect(toEmbedUrl('javascript:alert(1)')).toBe('about:blank');
  });
});

describe('youtubeId', () => {
  it('watch', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('youtu.be', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
  });
  it('shorts', () => {
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('embed', () => {
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('не-YouTube -> null', () => {
    expect(youtubeId('https://kinescope.io/embed/abc123')).toBeNull();
  });
  it('кривой URL -> null', () => {
    expect(youtubeId('not-a-url')).toBeNull();
  });
});

describe('playerEmbedUrl', () => {
  it('YouTube — чистые параметры плеера', () => {
    const u = playerEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(u).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(u).toContain('rel=0');
    expect(u).toContain('iv_load_policy=3');
    expect(u).toContain('modestbranding=1');
  });
  it('не-YouTube — без изменений', () => {
    expect(playerEmbedUrl('https://kinescope.io/embed/abc123')).toBe('https://kinescope.io/embed/abc123');
  });
});
