import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BLOG_POSTS, blogPostUrl, getBlogPost } from '@/lib/blog';
import Page, { generateMetadata, generateStaticParams } from '@/app/(app)/blog/[slug]/page';
import sitemap from '@/app/sitemap';
import { GET as llmsFull } from '@/app/llms-full.txt/route';
import { BASE_BLOG_SLUGS } from './fixtures/blog-34ec8cf-slugs';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

const SLUG = 'ii-revyu-koda-sovety-ne-ravno-oshibki';
const PAPER = 'https://arxiv.org/html/2611.02566v2';

function post() {
  const article = getBlogPost(SLUG);
  expect(article, 'the AI code review article must exist').not.toBeNull();
  return article!;
}

describe('beginner article: useful AI review advice and known defects', () => {
  it('has no collision with the frozen base slugs', () => {
    expect(BASE_BLOG_SLUGS).not.toContain(SLUG);
  });

  it('registers the new slug exactly once and keeps all slugs unique', () => {
    const slugs = BLOG_POSTS.map(({ slug }) => slug);
    expect(slugs.filter((slug) => slug === SLUG)).toHaveLength(1);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('opens with a 40–60 word answer naming the system and both percentages', () => {
    const first = post().body.split('\n\n')[0];
    const words = first.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    expect(first).toContain('Gemini Code Assist');
    expect(first).toContain('78%');
    expect(first).toContain('8,1%');
  });

  it('links the methodology, results and limitations to the exact paper version', () => {
    for (const anchor of ['S4.SS1', 'S5.SS2', 'A6.T7', 'Sx1']) {
      expect(post().body).toContain(`](${PAPER}#${anchor})`);
    }
  });

  it('provides three or four FAQs and the requested reading and practice links', () => {
    const article = post();
    expect(article.faq.length).toBeGreaterThanOrEqual(3);
    expect(article.faq.length).toBeLessThanOrEqual(4);
    expect(article.faq.every(({ question, answer }) => question.trim() && answer.trim())).toBe(true);
    for (const href of [
      '/blog/pochemu-neyroset-vret',
      '/blog/ii-skazal-87-procentov-kak-proverit',
      '/courses/vibecoding',
      '/courses/claude-code-agents/lessons/1',
    ]) {
      expect(article.body).toContain(`](${href})`);
    }
  });

  it('exposes the canonical URL through static params, metadata, sitemap and llms text', async () => {
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: SLUG }) });
    expect(metadata.alternates?.canonical).toBe(blogPostUrl(SLUG));
    expect(await sitemap()).toContainEqual(expect.objectContaining({ url: blogPostUrl(SLUG) }));
    expect(await llmsFull().text()).toContain(blogPostUrl(SLUG));
  });

  it('renders Article and FAQPage with the same answers that readers see', async () => {
    const article = post();
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: SLUG }) }));
    const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const graph = JSON.parse(scripts[0][1])['@graph'] as Record<string, unknown>[];
    expect(graph.find((node) => node['@type'] === 'Article')).toMatchObject({
      headline: article.title, url: blogPostUrl(SLUG), datePublished: article.published,
    });
    expect(graph.find((node) => node['@type'] === 'FAQPage')?.mainEntity).toEqual(
      article.faq.map(({ question, answer }) => ({
        '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    );
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, '').replace(/\u00a0/g, ' ');
    for (const { question, answer } of article.faq) {
      expect(visible).toContain(question);
      expect(visible).toContain(answer);
    }
    expect(html).toContain('href="/courses/vibecoding"');
  });
});
