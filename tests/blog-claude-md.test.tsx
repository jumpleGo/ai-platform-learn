import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BLOG_POSTS, blogPostUrl, getBlogPost } from '@/lib/blog';
import Page, { generateMetadata, generateStaticParams } from '@/app/(app)/blog/[slug]/page';
import BlogIndex from '@/app/(app)/blog/page';
import sitemap from '@/app/sitemap';
import { GET as llmsFull } from '@/app/llms-full.txt/route';
import { parseBlocks } from '@/lib/markdown';
import { OLD_BLOG_SLUGS } from './fixtures/blog-f0fde9e-slugs';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

const SLUG = 'claude-md-primer-chek-list';
const PAPER = 'https://arxiv.org/html/2611.02383v1';
const EXAMPLE = 'public/examples/claude-md-shopping-list';

function assertRegistered(slugs: readonly string[]) {
  expect(slugs.filter((slug) => slug === SLUG), 'the new article must be registered once').toHaveLength(1);
  expect(new Set(slugs).size, 'all article slugs must be unique').toBe(slugs.length);
}

function post() {
  const value = getBlogPost(SLUG);
  expect(value, 'the free CLAUDE.md article must exist').not.toBeNull();
  return value!;
}

describe('free beginner CLAUDE.md article', () => {
  it('registers the new slug exactly once', () => {
    assertRegistered(BLOG_POSTS.map(({ slug }) => slug));
  });

  it.fails('rejects the frozen old slug list with the same registration assertion', () => {
    assertRegistered(OLD_BLOG_SLUGS);
  });

  it('preserves every old slug and its order, away from the append point', () => {
    const slugs = BLOG_POSTS.map(({ slug }) => slug);
    expect(slugs.filter((slug) => slug !== SLUG)).toEqual(OLD_BLOG_SLUGS);
    expect(slugs.indexOf(SLUG)).toBeGreaterThan(0);
    expect(slugs.indexOf(SLUG)).toBeLessThan(slugs.length - 1);
  });

  it('starts with a direct answer of 40–60 words', () => {
    const first = post().body.split('\n\n')[0];
    expect(first).toMatch(/^CLAUDE\.md —/);
    expect(first.trim().split(/\s+/).length).toBeGreaterThanOrEqual(40);
    expect(first.trim().split(/\s+/).length).toBeLessThanOrEqual(60);
  });

  it('attributes the approved statistics and separates completeness from code quality', () => {
    const body = post().body;
    for (const anchor of ['S4.T2', 'S5.T4', 'S6.T5']) {
      expect(body).toContain(`](${PAPER}#${anchor})`);
    }
    expect(body).toContain('столбец CLAUDE');
    expect(body).toContain('18.7% → 82.8%');
    expect(body).toContain('полнота категорий');
    expect(body).toContain('не качество кода');
    expect(body).toContain('не замер нашего примера');
    const percentages = body.match(/\d+(?:[.,]\d+)?%/g) ?? [];
    expect([...percentages].sort()).toEqual(['18.7%', '68.3%', '69.8%', '71.2%', '81.8%', '82.8%'].sort());
  });

  it('offers the 10 + 4 + 2 categories with practical limits', () => {
    const body = post().body;
    const checklist = body.split('## Чек-лист: 16 категорий')[1]?.split('\n## ')[0];
    expect(checklist).toBeTruthy();
    const groups = parseBlocks(checklist!).filter((block) => block.t === 'ol');
    expect(groups.map((group) => group.items.length)).toEqual([10, 4, 2]);
    expect(checklist).toContain('Уберите то, что не относится к вашему проекту');
    expect(checklist).toContain('Не выдумывайте команды и контакты');
    expect(checklist).toContain('Обновляйте инструкции вместе с кодом');
  });

  it('shows the exact downloadable example and only real sample commands', () => {
    const body = post().body;
    const instructions = readFileSync(`${EXAMPLE}/CLAUDE.md`, 'utf8').trim();
    expect(parseBlocks(body).filter((block) => block.t === 'code').map((block) => block.text)).toContain(instructions);
    expect(body).toContain('](/examples/claude-md-shopping-list.zip)');
    const pkg = JSON.parse(readFileSync(`${EXAMPLE}/package.json`, 'utf8'));
    expect(pkg.scripts).toEqual({ start: 'node app.mjs', test: 'node --test check.mjs' });
    expect(instructions).toContain('npm start');
    expect(instructions).toContain('npm test');
  });

  it('exposes the article through the list, static params, canonical, sitemap and llms text', async () => {
    expect(renderToStaticMarkup(<BlogIndex />)).toContain(`href="/blog/${SLUG}"`);
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: SLUG }) });
    expect(metadata.alternates?.canonical).toBe(blogPostUrl(SLUG));
    expect(await sitemap()).toContainEqual(expect.objectContaining({ url: blogPostUrl(SLUG) }));
    expect(await llmsFull().text()).toContain(blogPostUrl(SLUG));
  });

  it('renders the visible FAQ through Article/FAQPage and labels the paid lesson honestly', async () => {
    const article = post();
    expect(article.faq.length).toBeGreaterThanOrEqual(3);
    expect(article.faq.length).toBeLessThanOrEqual(4);
    // lessonPath triggers a pre-existing "watch for free" card; this lesson is paid.
    expect(article.lessonPath).toBeNull();
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
    for (const href of ['/courses/claude-code-agents', '/courses/claude-code-agents/lessons/6', '/courses/claude-code-agents/lessons/1']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(visible).toContain('платный урок');
    expect(visible).not.toContain('Смотреть можно бесплатно и без регистрации');
  });
});
