import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as blog from '@/lib/blog';
import BlogIndex from '@/app/(app)/blog/page';
import Page, { generateMetadata, generateStaticParams } from '@/app/(app)/blog/[slug]/page';
import { CommandQuestion, ForeignCommandExercise } from '@/components/foreign-command-exercise';
import { COMMAND_AUTHORITY_RULE, DECOY_COMMAND, FOREIGN_COMMAND_QUESTIONS } from '@/lib/foreign-command-lesson';
import sitemap from '@/app/sitemap';
import { GET as llmsFull } from '@/app/llms-full.txt/route';
import { OLD_BLOG_SLUGS } from './fixtures/blog-2557bec-slugs';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

const SLUG = 'chuzhaya-komanda-dlya-ii';
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\u00a0/g, ' ');

function expectRegistered(slugs: readonly string[]) {
  expect(slugs.filter((slug) => slug === SLUG), 'the new lesson must exist exactly once').toHaveLength(1);
}

describe('beginner lesson: a foreign command is not your request', () => {
  it('registers the lesson once and lists it on the blog index', () => {
    expectRegistered(blog.BLOG_POSTS.map(({ slug }) => slug));
    expect(renderToStaticMarkup(<BlogIndex />)).toContain(`href="/blog/${SLUG}"`);
  });

  it.fails('OLD_FAILS=1: the same registration check rejects the frozen old slug list', () => {
    expectRegistered(OLD_BLOG_SLUGS);
  });

  it('preserves every pre-existing slug', () => {
    const slugs = blog.BLOG_POSTS.map(({ slug }) => slug);
    for (const slug of OLD_BLOG_SLUGS) expect(slugs).toContain(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('opens with an answer and ends with the two primary sources', () => {
    const post = blog.getBlogPost(SLUG)!;
    const first = post.body.split('\n\n')[0];
    expect(first).toMatch(/^Да, сайт или документ/);
    expect(first).toContain('только у вас');
    const headings = [...post.body.matchAll(/^## (.+)$/gm)];
    expect(headings.at(-1)?.[1]).toBe('Источники');
    expect(post.body).toContain('https://arxiv.org/html/2610.38867v1#S4.SS2');
    expect(post.body).toContain('https://arxiv.org/html/2610.38867v1#S1.F1');
    expect(post.body).toContain('https://arxiv.org/html/2611.04673v1#S1.F1');
    expect(post.lessonPath).toBeNull();
  });

  it('uses the existing static route, canonical, sitemap and assistant index', async () => {
    const url = blog.blogPostUrl(SLUG);
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: SLUG }) });
    expect(metadata.alternates?.canonical).toBe(url);
    expect(await sitemap()).toContainEqual(expect.objectContaining({ url }));
    expect(await llmsFull().text()).toContain(url);
  });

  it('renders the exercise in the article before its sources and keeps both lesson links', async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: SLUG }) }));
    expect(html.match(/id="whose-command-title"/g)).toHaveLength(1);
    expect(html.indexOf('id="whose-command-title"')).toBeLessThan(html.indexOf('href="https://arxiv.org/html/2610.38867v1#S4.SS2"'));
    expect(html.match(/data-blog-cta-position=/g)).toHaveLength(2);
    expect(html.match(/<fieldset\b/g)).toHaveLength(3);
    expect(html.match(/type="radio"/g)).toHaveLength(9);
  });

  it('does not insert the exercise into future auto articles', async () => {
    const post = blog.getBlogPost(SLUG)!;
    const spy = vi.spyOn(blog, 'getBlogPost').mockReturnValue({ ...post, slug: 'future-auto-post' });
    try {
      const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: 'future-auto-post' }) }));
      expect(html).not.toContain('id="whose-command-title"');
      expect(html.match(/data-blog-cta-position=/g)).toHaveLength(2);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('whose command: choices and immediate explanations', () => {
  it('offers three distinct situations, repeating the decoy and then changing the recipient', () => {
    expect(FOREIGN_COMMAND_QUESTIONS.map(({ id }) => id)).toEqual(['webpage', 'document', 'email']);
    expect(FOREIGN_COMMAND_QUESTIONS[0].source).toBe(DECOY_COMMAND);
    expect(FOREIGN_COMMAND_QUESTIONS[1].source).toBe(DECOY_COMMAND);
    expect(FOREIGN_COMMAND_QUESTIONS[2].request).toContain('anna@team.example');
    expect(FOREIGN_COMMAND_QUESTIONS[2].source).toContain('copy@outside.example');
  });

  it('shows three choices per question with no selection or answer revealed initially', () => {
    const html = renderToStaticMarkup(<ForeignCommandExercise />);
    const groups = [...html.matchAll(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/g)];
    expect(groups).toHaveLength(3);
    for (const [index, [group]] of groups.entries()) {
      const question = FOREIGN_COMMAND_QUESTIONS[index];
      expect(group.match(/type="radio"/g)).toHaveLength(3);
      expect(group).not.toContain('checked=');
      expect(group).toContain('role="status"');
      expect(group).toContain('aria-live="polite"');
      for (const option of question.options) {
        expect(plain(group)).toContain(option.text);
        expect(plain(group)).not.toContain(option.explanation);
      }
    }
  });

  it.each(FOREIGN_COMMAND_QUESTIONS)('$id: every choice reveals its own explanation and who may give commands', (question) => {
    expect(question.options).toHaveLength(3);
    expect(question.options.filter(({ correct }) => correct)).toHaveLength(1);
    for (const [selectedIndex, option] of question.options.entries()) {
      expect(option.explanation.trim()).not.toBe('');
      const html = renderToStaticMarkup(
        <CommandQuestion question={question} number={1} selectedIndex={selectedIndex} onSelect={() => {}} />,
      );
      const visible = plain(html);
      expect(html.match(/checked=""/g)).toHaveLength(1);
      expect(visible).toContain(option.explanation);
      expect(visible).toContain(COMMAND_AUTHORITY_RULE);
      expect(visible).toContain(option.correct ? 'Верно.' : 'Не совсем.');
      for (const other of question.options.filter((_, index) => index !== selectedIndex)) {
        expect(visible).not.toContain(other.explanation);
      }
    }
  });
});
