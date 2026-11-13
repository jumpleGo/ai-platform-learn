import { describe, it, expect, vi } from 'vitest';
import { getBlogPost } from '@/lib/blog';
import sitemap from '@/app/sitemap';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn().mockResolvedValue([]) }));

const EXPLAINERS = [
  { slug: 'chto-takoe-llm', term: /LLM/ },
  { slug: 'chto-takoe-rag', term: /RAG/ },
  { slug: 'chto-takoe-mcp', term: /MCP/ },
];
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe('GEO: статьи «Что такое LLM/RAG/MCP простыми словами»', () => {
  for (const { slug, term } of EXPLAINERS) {
    it(`${slug}: статья есть, первый абзац 40–70 слов и содержит термин`, () => {
      const post = getBlogPost(slug);
      expect(post).not.toBeNull();
      const first = post!.body.split('\n\n')[0];
      expect(words(first)).toBeGreaterThanOrEqual(40);
      expect(words(first)).toBeLessThanOrEqual(70);
      expect(first).toMatch(term);
      expect(post!.body).toContain('](/free)');
      expect(post!.body).toContain('](/blog/kakuyu-neyroset-vybrat)');
    });

    it(`${slug}: есть в sitemap`, async () => {
      const urls = (await sitemap()).map((e) => e.url);
      expect(urls.some((u) => u.endsWith(`/blog/${slug}`))).toBe(true);
    });
  }
});
