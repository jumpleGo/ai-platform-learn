import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/(app)/blog/[slug]/page';
import * as blog from '@/lib/blog';
import { BEGINNER_URL, isFreeHub } from '@/lib/site';
import { courseKey } from '@/lib/slug';
import { getPublishedCoursesWithLessons as getCatalog, type CourseWithLessons, type NumberedLesson } from '@/lib/db/courses';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
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
const firstFree = (c: CourseWithLessons) => Math.min(...c.lessons
  .filter(l => l.access === 'free' && l.published !== false).map(l => l.number));
const pageHtml = async (slug: string) => renderToStaticMarkup(await Page({ params: Promise.resolve({ slug }) }));
async function start(slug: string) {
  const html = (await pageHtml(slug)).match(/<section\b[^>]*aria-labelledby="post-start"[\s\S]*?<\/section>/)?.[0];
  expect(html, slug).toBeDefined();
  return html!;
}
function pair(html: string, key: string, number: number) {
  expect(html).toContain(`href="/courses/${key}"`);
  expect(html).toContain(`href="/courses/${key}/lessons/${number}"`);
  expect(html).not.toContain('href="/courses"');
}
let catalog: CourseWithLessons[];
beforeEach(() => {
  catalog = [course('claude-code-agents', 7), course('claude-code', 5), course('vibecoding', 4), course('ai-cartoons', 6)];
  vi.mocked(getCatalog).mockReset().mockResolvedValue(catalog);
});
afterEach(() => vi.restoreAllMocks());

it.each([
  ['ii-agent-prostymi-slovami', 'claude-code-agents', 7],
  ['promt-inzhiniring-prostymi-slovami', 'claude-code', 5],
  ['kakuyu-neyroset-vybrat', 'claude-code', 5],
] as const)('editorial link or topic: %s', async (slug, key, number) => {
  catalog[0].lessons.reverse();
  const html = await start(slug);
  pair(html, key, number);
  expect(html).toContain('С чего начать');
  expect(html).not.toMatch(/\/lessons\/(1|2|8)"/);
  expect(html).not.toMatch(/бесплатн\S*\s+курс|₽|рубл/i);
});
it.each(['empty', 'throw'])('catalog %s preserves article without CTA', async state => {
  if (state === 'throw') vi.mocked(getCatalog).mockRejectedValue(new Error('catalog unavailable'));
  else vi.mocked(getCatalog).mockResolvedValue([]);
  const html = await pageHtml('ii-agent-prostymi-slovami');
  for (const marker of ['<article', 'application/ld+json', 'id="post-faq"']) expect(html).toContain(marker);
  expect(html).not.toContain('aria-labelledby="post-start"');
});
it.each(['unpublished', 'test', 'no-free'])('exclude unavailable course: %s', async state => {
  if (state === 'unpublished') catalog[0].published = false;
  if (state === 'test') catalog[0].isTest = true;
  if (state === 'no-free') catalog[0].lessons = [lesson(1, 'free', false), lesson(2, 'paid')];
  const html = await start('ii-agent-prostymi-slovami');
  pair(html, 'claude-code', 5);
  expect(html).not.toContain('/courses/claude-code-agents');
});
it.each([
  ['Как сделать видео с ИИ', undefined, 'ai-cartoons', 6],
  ['Первый сайт с ИИ', undefined, 'vibecoding', 4],
  ['Новый инструмент', ['ИИ-агенты'], 'claude-code-agents', 7],
  ['Обзор нового инструмента', undefined, null, null],
] as const)('auto article without editorial links: %s', async (title, tags, key, number) => {
  vi.spyOn(blog, 'getBlogPost').mockReturnValue({
    ...blog.BLOG_POSTS[0], slug: 'future', title, topic: '', body: 'New auto article.', lessonPath: null,
    ...(tags ? { tags } : {}),
  });
  const fallback = catalog.find(c => `/courses/${courseKey(c)}` === BEGINNER_URL) ?? catalog.find(isFreeHub)!;
  const html = await start('future');
  pair(html, key ?? courseKey(fallback), number ?? firstFree(fallback));
  catalog.reverse();
  expect(await start('future')).toBe(html);
});
it('covers ≥90% of real posts with the public catalog snapshot', async () => {
  // Public curl snapshot: see the #167 measurement report.
  catalog = ([['vibecoding', 1, false], ['claude-code-agents', 1, false],
    ['ai-cartoons', null, true], ['claude-code', 2, false]] as const).map(([slug, first, isTest], order) => ({
    ...course(slug, first ?? 1), order, isTest, lessons: first === null ? [] : [lesson(first, 'free')],
  }));
  vi.mocked(getCatalog).mockResolvedValue(catalog);
  const covered = await Promise.all(blog.BLOG_POSTS.map(async post => {
    const html = await start(post.slug);
    return catalog.some(c => !c.isTest && html.includes(`href="/courses/${c.slug}"`)
      && html.includes(`href="/courses/${c.slug}/lessons/${firstFree(c)}"`));
  }));
  expect(covered.filter(Boolean).length).toBeGreaterThanOrEqual(Math.ceil(blog.BLOG_POSTS.length * 0.9));
});
