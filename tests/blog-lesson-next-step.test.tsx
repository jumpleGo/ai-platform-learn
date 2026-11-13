import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import Page, { generateStaticParams } from '@/app/(app)/blog/[slug]/page';
import * as blog from '@/lib/blog';
import sitemap from '@/app/sitemap';
import { Markdown } from '@/components/markdown';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { AGENTS_INTRO_LESSON } from '@/lib/free-lessons';
import { lessonPath } from '@/lib/slug';
import { nbspMarkdown } from '@/lib/typography';
import { track } from '@/lib/analytics/track-client';
import { renderBlogPost as renderPost } from './fixtures/blog-page';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

const introHref = '/courses/claude-code-agents/lessons/1';
const positions = ['after_first_third', 'after_body'] as const;

type CtaProps = { slug: string; position: typeof positions[number] };
function ctaElements(node: ReactNode): ReactElement<CtaProps>[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (typeof child.type === 'function' && child.type.name === 'BlogLessonNextStep') {
      return [child as ReactElement<CtaProps>];
    }
    const props = child.props as { children?: ReactNode; insertAfterBlock?: { content: ReactNode } };
    return [...ctaElements(props.children), ...ctaElements(props.insertAfterBlock?.content)];
  });
}

function nextSteps(html: string, slug: string) {
  const blocks = positions.map(position => {
    const block = html.match(new RegExp(`<section\\b[^>]*data-blog-cta-position="${position}"[\\s\\S]*?<\\/section>`))?.[0];
    expect(block, `${position} must be visible on ${slug}`).toBeDefined();
    expect(block).toContain(`href="${introHref}"`);
    expect(block).toContain('бесплатный вводный урок');
    expect(block).not.toMatch(/бесплатн\p{L}*\s+курс|free\s+course/iu);
    const headingId = block!.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(block).toContain(`id="${headingId}"`);
    return block!;
  });
  expect(html.match(/data-blog-cta-position=/g)).toHaveLength(2);
  expect(html.indexOf(blocks[0])).toBeLessThan(html.indexOf(blocks[1]));
  expect(blocks[0].match(/aria-labelledby="([^"]+)"/)?.[1])
    .not.toBe(blocks[1].match(/aria-labelledby="([^"]+)"/)?.[1]);
  return blocks;
}

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockReset().mockResolvedValue([]);
  vi.mocked(track).mockClear();
});
afterEach(() => vi.restoreAllMocks());

it('inserts both intro links at block boundaries and preserves the complete article body', async () => {
  const fixture = {
    ...blog.BLOG_POSTS[0], slug: 'fixture', title: 'Первый шаг с ИИ',
    body: [
      'Начало статьи.', '## Первая часть', '- Первый пункт\n- Второй пункт',
      '```ts\nconst lesson = 1;\n```', '> Важное замечание.',
      '| Инструмент | Задача |\n| --- | --- |\n| ИИ | Помощь |',
      '1. Первый шаг\n2. Второй шаг', '### Последняя часть', 'Конец статьи.',
    ].join('\n\n'),
    faq: [], lessonPath: null,
  };
  vi.spyOn(blog, 'getBlogPost').mockReturnValue(fixture);
  vi.mocked(getPublishedCoursesWithLessons).mockRejectedValue(new Error('catalog must not be read'));
  const html = await renderPost(fixture.slug);
  const [first, last] = nextSteps(html, fixture.slug);
  expect(introHref).toBe(lessonPath(AGENTS_INTRO_LESSON.courseSlug, AGENTS_INTRO_LESSON.number));
  expect(html.indexOf(first)).toBeGreaterThan(html.indexOf('Второй пункт'));
  expect(html.indexOf(first)).toBeLessThan(html.indexOf('const lesson = 1;'));
  expect(html.indexOf(last)).toBeGreaterThan(html.indexOf('Конец статьи.'));
  const body = renderToStaticMarkup(<Markdown source={nbspMarkdown(fixture.body)} variant="read" className="mt-8" />);
  expect(html.replace(first, '').replace(last, '')).toContain(body);
  expect(getPublishedCoursesWithLessons).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalled();
});

it('covers every blog article in the sitemap, including auto-articles without lesson links', async () => {
  const entries = (await sitemap()).filter(({ url }) => new URL(url).pathname.startsWith('/blog/'));
  const slugs = entries.map(({ url }) => new URL(url).pathname.slice('/blog/'.length));
  expect(slugs).toEqual(blog.BLOG_POSTS.map(({ slug }) => slug));
  expect(generateStaticParams()).toEqual(slugs.map(slug => ({ slug })));
  expect(blog.BLOG_POSTS.some(post => post.lessonPath === null)).toBe(true);
  vi.mocked(getPublishedCoursesWithLessons).mockClear();
  for (const slug of slugs) nextSteps(await renderPost(slug), slug);
  expect(getPublishedCoursesWithLessons).not.toHaveBeenCalled();
  if (process.env.GEO_MEASURE === '1') process.stdout.write(`AUTO_ARTICLES_COVERED=${slugs.length}/${slugs.length}\n`);
});

it.each(positions)('tracks the article slug and %s position only on a click', async position => {
  const slug = blog.BLOG_POSTS[0].slug;
  const page = await Page({ params: Promise.resolve({ slug }) });
  const element = ctaElements(page).find(cta => cta.props.position === position);
  expect(element, `template must pass ${position} to its CTA`).toBeDefined();
  const Component = element!.type as (props: CtaProps) => ReactElement<{ children: ReactNode }>;
  const block = Component(element!.props);
  const link = Children.toArray(block.props.children)
    .filter(isValidElement<{ href?: string; onClick?: () => void }>)
    .find(child => child.props.href === introHref);
  expect(link?.props.onClick).toBeTypeOf('function');
  expect(track).not.toHaveBeenCalled();
  link!.props.onClick!();
  expect(track).toHaveBeenCalledExactlyOnceWith('blog_cta_click', { slug, position });
});
