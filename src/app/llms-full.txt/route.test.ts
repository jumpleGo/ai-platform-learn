import { describe, expect, it } from 'vitest';
import { BLOG_POSTS } from '@/lib/blog';

const routeModule = process.env.LLMS_FULL_ROUTE_PATH
  ? process.env.LLMS_FULL_ROUTE_PATH
  : './route';

describe('llms-full.txt', () => {
  it('lists every blog post from BLOG_POSTS', async () => {
    const { GET } = await import(/* @vite-ignore */ routeModule);
    const text = await (GET() as Response).text();
    for (const slug of ['chto-takoe-llm', 'chto-takoe-rag', 'chto-takoe-mcp']) {
      expect(text).toContain(`/blog/${slug}`);
    }
    expect(text.match(/\/blog\/[a-z0-9-]+/g)?.length ?? 0).toBe(BLOG_POSTS.length);
  });
});
