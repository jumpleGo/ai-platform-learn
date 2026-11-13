import { describe, expect, it } from 'vitest';
import { BLOG_POSTS } from '@/lib/blog';
import { GET } from './route';

describe('llms-full.txt', () => {
  it('lists every blog post from BLOG_POSTS', async () => {
    const text = await GET().text();
    for (const slug of ['chto-takoe-llm', 'chto-takoe-rag', 'chto-takoe-mcp']) {
      expect(text).toContain(`/blog/${slug}`);
    }
    expect(text.match(/\/blog\/[a-z0-9-]+/g)?.length ?? 0).toBe(BLOG_POSTS.length);
  });
});
