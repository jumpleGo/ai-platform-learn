import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/(app)/blog/[slug]/page';
import * as blog from '@/lib/blog';
import { getPublishedCoursesWithLessons as getCatalog, type CourseWithLessons, type NumberedLesson } from '@/lib/db/courses';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));
const lesson = (number: number, access: 'free' | 'paid', published = true): NumberedLesson => ({
  id: `lesson-${number}`, courseId: 'id', number, order: number, title: 'Lesson',
  description: '', access, published, videoEmbedUrl: '', durationSec: null, materials: '',
  views: 0, previewImageUrl: null, coverCaption: null, hideHeader: false, hideFooter: false,
  hideBackLink: false, hideLessonsNav: false, marketingVariants: [], relatedVariants: [],
  marketingHtml: null, relatedHtml: null,
});
const course = (slug: string, first: number): CourseWithLessons => ({
  id: `${slug}-id`, slug, title: 'Course', description: '', coverUrl: null, order: 0,
  published: true, access: 'paid', isTest: false, testToastMessage: null, testLandingHtml: null,
  showBadge: false, badgeText: null, highlightBackground: false, clickCount: 0,
  lessons: [lesson(1, 'free', false), lesson(2, 'paid'), lesson(first, 'free'), lesson(first + 1, 'free')],
});
const introHref = '/courses/claude-code-agents/lessons/1';
const pageHtml = async (slug: string) => renderToStaticMarkup(await Page({ params: Promise.resolve({ slug }) }));
async function start(slug: string) {
  const html = await pageHtml(slug);
  const blocks = html.match(/<section\b[^>]*data-blog-cta-position="[^"]+"[\s\S]*?<\/section>/g) ?? [];
  expect(blocks, slug).toHaveLength(2);
  for (const block of blocks) {
    expect(block).toContain(`href="${introHref}"`);
    expect(block).toContain('бесплатный вводный урок');
    expect(block).not.toMatch(/бесплатн\S*\s+курс|₽|рубл/i);
  }
  expect(getCatalog).not.toHaveBeenCalled();
  return blocks.join('');
}
let catalog: CourseWithLessons[];
beforeEach(() => {
  catalog = [course('claude-code-agents', 7), course('claude-code', 5), course('vibecoding', 4), course('ai-cartoons', 6)];
  vi.mocked(getCatalog).mockReset().mockResolvedValue(catalog);
});
afterEach(() => vi.restoreAllMocks());

// The shared template now has a fixed intro target, independent of catalog
// availability, lesson numbering and article topic (task #229 rework).
it.each([
  'ii-agent-prostymi-slovami',
  'promt-inzhiniring-prostymi-slovami',
  'kakuyu-neyroset-vybrat',
])('keeps the fixed intro target for editorial article: %s', async slug => {
  catalog[0].lessons.reverse();
  await start(slug);
});
it.each(['empty', 'throw'])('catalog %s preserves the article and both CTAs', async state => {
  if (state === 'throw') vi.mocked(getCatalog).mockRejectedValue(new Error('catalog unavailable'));
  else vi.mocked(getCatalog).mockResolvedValue([]);
  const html = await pageHtml('ii-agent-prostymi-slovami');
  for (const marker of ['<article', 'application/ld+json', 'id="post-faq"']) expect(html).toContain(marker);
  await start('ii-agent-prostymi-slovami');
});
it.each(['unpublished', 'test', 'no-free'])('catalog state %s cannot change the intro target', async state => {
  if (state === 'unpublished') catalog[0].published = false;
  if (state === 'test') catalog[0].isTest = true;
  if (state === 'no-free') catalog[0].lessons = [lesson(1, 'free', false), lesson(2, 'paid')];
  await start('ii-agent-prostymi-slovami');
});
it.each([
  ['Как сделать видео с ИИ', undefined],
  ['Первый сайт с ИИ', undefined],
  ['Новый инструмент', ['ИИ-агенты']],
  ['Обзор нового инструмента', undefined],
] as const)('auto article without editorial links: %s', async (title, tags) => {
  vi.spyOn(blog, 'getBlogPost').mockReturnValue({
    ...blog.BLOG_POSTS[0], slug: 'future', title, topic: '', body: 'New auto article.', lessonPath: null,
    ...(tags ? { tags } : {}),
  });
  const html = await start('future');
  catalog.reverse();
  expect(await start('future')).toBe(html);
});
it('covers every real post without reading the public catalog', async () => {
  for (const post of blog.BLOG_POSTS) await start(post.slug);
});
