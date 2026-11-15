import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BLOG_POSTS, blogPostUrl, getBlogPost } from '@/lib/blog';
import Page, { generateMetadata, generateStaticParams } from '@/app/(app)/blog/[slug]/page';
import sitemap from '@/app/sitemap';
import { GET as llmsFull } from '@/app/llms-full.txt/route';
import { OLD_BLOG_SLUGS } from './fixtures/blog-9ac6ccc-slugs';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

const SLUG = 'ii-skazal-87-procentov-kak-proverit';
const LESSON = '/courses/claude-code-agents/lessons/1';

function post() {
  const value = getBlogPost(SLUG);
  expect(value, 'the article must exist').not.toBeNull();
  return value!;
}

describe('beginner article: checking confident AI numbers', () => {
  it('is absent from the frozen BLOG_POSTS slugs at 9ac6ccc', () => {
    expect(OLD_BLOG_SLUGS).not.toContain(SLUG);
  });

  it('opens with a direct answer of 40–70 words and offers three checks', () => {
    const first = post().body.split('\n\n')[0];
    const words = first.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(70);
    expect(first).toMatch(/87%/);
    expect(post().body.match(/^## [123]\. /gm)).toHaveLength(3);
  });

  it('has at least three FAQs and links to the related article, lesson 1 and a program', () => {
    const article = post();
    expect(article.faq.length).toBeGreaterThanOrEqual(3);
    expect(article.faq.every(({ question, answer }) => question.trim() && answer.trim())).toBe(true);
    expect(article.body).toContain('](/blog/pochemu-neyroset-vret)');
    expect(article.body).toContain(`](${LESSON})`);
    expect(article.body).toContain('](/courses/claude-code-agents)');
  });

  it('registers a unique slug through the existing page mechanism', async () => {
    expect(BLOG_POSTS.filter(({ slug }) => slug === SLUG)).toHaveLength(1);
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: SLUG }) });
    expect(metadata.alternates?.canonical).toBe(blogPostUrl(SLUG));
  });

  it('appears in the existing sitemap', async () => {
    expect(await sitemap()).toContainEqual(expect.objectContaining({ url: blogPostUrl(SLUG) }));
  });

  it('appears in the existing llms-full text', async () => {
    expect(await llmsFull().text()).toContain(blogPostUrl(SLUG));
  });

  it('renders Article and FAQPage describing the visible post', async () => {
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
    expect(html).toContain(`href="${LESSON}"`);
  });
});
