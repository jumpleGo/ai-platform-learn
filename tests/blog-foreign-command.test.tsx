import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BLOG_POSTS } from '@/lib/blog';
import BlogIndex from '@/app/(app)/blog/page';
import { OLD_BLOG_SLUGS } from './fixtures/blog-2557bec-slugs';

const SLUG = 'chuzhaya-komanda-dlya-ii';

function expectRegistered(slugs: readonly string[]) {
  expect(slugs.filter((slug) => slug === SLUG), 'the new lesson must exist exactly once').toHaveLength(1);
}

describe('beginner lesson: a foreign command is not your request', () => {
  it('registers the lesson once and lists it on the blog index', () => {
    expectRegistered(BLOG_POSTS.map(({ slug }) => slug));
    expect(renderToStaticMarkup(<BlogIndex />)).toContain(`href="/blog/${SLUG}"`);
  });

  it.fails('OLD_FAILS=1: the same registration check rejects the frozen old slug list', () => {
    expectRegistered(OLD_BLOG_SLUGS);
  });
});
