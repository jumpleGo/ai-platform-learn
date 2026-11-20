import { describe, expect, it } from 'vitest';
import { parseBlocks } from '@/lib/markdown';
import { getBlogPost } from '@/lib/blog';

describe('картинки в Markdown', () => {
  it('одна картинка — отдельный блок с подписью', () => {
    expect(parseBlocks('Текст\n\n![Подпись](/blog/x.webp)\n\nЕщё')).toEqual([
      { t: 'p', text: 'Текст' },
      { t: 'images', items: [{ src: '/blog/x.webp', alt: 'Подпись' }] },
      { t: 'p', text: 'Ещё' },
    ]);
  });

  it('строки подряд встают в один ряд', () => {
    const b = parseBlocks('![a](/a.webp)\n![b](/b.webp)');
    expect(b).toEqual([{ t: 'images', items: [{ src: '/a.webp', alt: 'a' }, { src: '/b.webp', alt: 'b' }] }]);
  });

  it('внешние ссылки на картинки не принимаются', () => {
    expect(parseBlocks('![x](https://evil.example/x.png)')[0].t).toBe('p');
  });

  it('у статьи про английский все картинки на месте', async () => {
    const fs = await import('node:fs');
    const post = getBlogPost('svoe-prilozhenie-dlya-angliyskogo-s-claude')!;
    const imgs = parseBlocks(post.body).flatMap((b) => (b.t === 'images' ? b.items : []));
    expect(imgs.length).toBeGreaterThan(5);
    for (const im of imgs) expect(fs.existsSync(`public${im.src}`)).toBe(true);
    expect(fs.existsSync(`public${post.cover}`)).toBe(true);
  });
});
