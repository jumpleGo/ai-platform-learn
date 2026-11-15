import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import { GET as llms } from '@/app/llms.txt/route';
import { GET as llmsFull } from '@/app/llms-full.txt/route';
import { BLOG_POSTS } from '@/lib/blog';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { BLOG_DISCOVERABILITY_FIXTURE } from './fixtures/blog-discoverability.fixture';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockReset().mockResolvedValue([]);
});

function missingBlogSlugs(slugs: readonly string[], urls: readonly string[]): string[] {
  const present = new Set(urls);
  return slugs.filter((slug) => !present.has(`https://gelato.education/blog/${slug}`));
}

function markdownLinkUrls(text: string): string[] {
  return Array.from(text.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g), ([, url]) => url);
}

// Every BLOG_POSTS entry is published; include auto-posts and posts without lesson links.
const publishedSlugs = BLOG_POSTS.map(({ slug }) => slug);

describe('published blog post discoverability', () => {
  it('includes every published post URL in sitemap.xml', async () => {
    expect(publishedSlugs.length).toBeGreaterThan(0);
    const urls = (await sitemap()).map(({ url }) => url);
    expect(missingBlogSlugs(publishedSlugs, urls)).toEqual([]);
  });

  it.each([
    ['llms.txt', llms],
    ['llms-full.txt', llmsFull],
  ] as const)('links to every published post URL in %s', async (_name, get) => {
    const response = await get();
    expect(response.status).toBe(200);
    const urls = markdownLinkUrls(await response.text());
    expect(missingBlogSlugs(publishedSlugs, urls)).toEqual([]);
  });

  it('finds exactly the omitted slug in the frozen incomplete sitemap', () => {
    const { slugs, sitemap: entries } = BLOG_DISCOVERABILITY_FIXTURE;
    expect(missingBlogSlugs(slugs, entries.map(({ url }) => url)))
      .toEqual(['gemini-4-hydrogen-carbon-agenty']);
  });
});
