import { describe, it, expect } from 'vitest';
import { toEmbedUrl } from '@/lib/video-url';

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
