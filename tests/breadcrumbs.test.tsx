import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LessonPage, { generateMetadata as lessonMetadata } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import BlogPostPage, { generateMetadata as blogMetadata } from '@/app/(app)/blog/[slug]/page';
import CourseLandingPage, { generateMetadata as courseMetadata } from '@/app/(app)/courses/[courseSlug]/page';
import StructuredDataPage from '@/app/@structuredData/[...path]/page';
import { PaymentModalProvider } from '@/components/payment/payment-modal-context';
import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
import { BLOG_POSTS, blogPostUrl, getBlogPost, type BlogPost } from '@/lib/blog';
import { getLessonSeoContent } from '@/lib/free-lessons';

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
vi.mock('@/components/payment/locked-video-player', () => ({ LockedVideoPlayer: () => null }));
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));
vi.mock('@/lib/blog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/blog')>();
  return { ...actual, getBlogPost: vi.fn(actual.getBlogPost) };
});

const slug = 'claude-code-agents';
const course: CourseWithLessons = {
  id: 'agents-course', slug, title: 'Название курса из данных', description: '',
  access: 'paid', published: true, isTest: false, coverUrl: null, order: 0,
  testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
  highlightBackground: false, clickCount: 0,
  lessons: [{
    id: 'lesson-1', courseId: 'agents-course', number: 1, title: 'Вступление', description: '',
    access: 'free', published: true, videoEmbedUrl: '', durationSec: 60, order: 1, views: 0,
    materials: '', previewImageUrl: null, marketingVariants: [], relatedVariants: [],
    coverCaption: null, hideHeader: false, hideFooter: false, hideBackLink: false,
    hideLessonsNav: false, marketingHtml: null, relatedHtml: null,
  }],
};

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([course]);
  vi.mocked(resolveLesson).mockResolvedValue({ course, lesson: course.lessons[0], number: 1, publishedAt: '2026-11-12T00:00:00.000Z' });
});

type Node = Record<string, unknown>;
const sourceGraphs = new WeakMap<Node, Node[]>();
function graphNodes(html: string): Node[] {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      const data = JSON.parse(match[1]);
      expect(data['@context']).toBe('https://schema.org');
      expect(Array.isArray(data['@graph'])).toBe(true);
      const graph = data['@graph'] as Node[];
      graph.forEach((node) => sourceGraphs.set(node, graph));
      return graph;
    });
}

function expectPreservedNodes(nodes: Node[]) {
  // Captured on origin/main before the fix. Serializing before snapshotting
  // preserves property order as well as every existing node's values.
  expect(JSON.stringify(nodes.filter((node) => node['@type'] !== 'WebPage'), null, 2)).toMatchSnapshot();
}

function expectCrumbs(nodes: Node[], canonical: string, names: string[], mainEntityId?: string) {
  const lists = nodes.filter((node) => node['@type'] === 'BreadcrumbList');
  expect(lists, 'BreadcrumbList отсутствует или не один').toHaveLength(1);
  const items = lists[0].itemListElement as { '@type': string; position: number; name: string; item: string }[];
  expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
  expect(items.map((i) => i.name)).toEqual(names);
  expect(items[0].item).toBe('https://gelato.education');
  items.forEach((i) => {
    expect(i['@type']).toBe('ListItem');
    expect(new URL(i.item).origin).toBe('https://gelato.education');
  });
  expect(items[items.length - 1].item).toBe(canonical);
  expect(canonical).not.toContain('?');
  expect(lists[0]['@id']).toBe(`${canonical}#breadcrumb`);
  const pages = nodes.filter((node) => node['@type'] === 'WebPage');
  expect(pages, 'WebPage must link the BreadcrumbList in the same @graph').toHaveLength(1);
  const sourceGraph = sourceGraphs.get(lists[0])!;
  expect(sourceGraph).toContain(pages[0]);
  expect(pages[0]).toMatchObject({
    '@id': `${canonical}#webpage`, url: canonical, name: names[names.length - 1],
    breadcrumb: { '@id': lists[0]['@id'] },
  });
  if (mainEntityId) {
    expect(pages[0].mainEntity).toEqual({ '@id': mainEntityId });
    expect(sourceGraph.some((node) => node['@id'] === mainEntityId)).toBe(true);
  } else {
    expect(pages[0]).not.toHaveProperty('mainEntity');
  }
}

describe('BreadcrumbList в существующем @graph', () => {
  it('лендинг курса: Главная → Курсы → курс', async () => {
    const html = renderToStaticMarkup(await StructuredDataPage({ params: Promise.resolve({ path: ['courses', slug] }) }));
    const nodes = graphNodes(html);
    const params = Promise.resolve({ courseSlug: slug });
    const landing = renderToStaticMarkup(<PaymentModalProvider>{await CourseLandingPage({ params, searchParams: Promise.resolve({}) })}</PaymentModalProvider>);
    expectPreservedNodes([...nodes, ...graphNodes(landing)]);
    const canonical = `https://gelato.education/courses/${slug}`;
    expect((await courseMetadata({ params })).alternates?.canonical).toBe(canonical);
    expectCrumbs(nodes, canonical, ['GELATO', 'Курсы', course.title], `${canonical}#course`);
    expect(nodes.some((n) => n['@type'] === 'Course')).toBe(true);
  });

  it('урок claude-code-agents/lessons/1: Главная → курс → урок', async () => {
    const html = renderToStaticMarkup(
      <PaymentModalProvider>{await LessonPage({ params: Promise.resolve({ courseSlug: slug, lessonNumber: '1' }), searchParams: Promise.resolve({}) })}</PaymentModalProvider>,
    );
    const nodes = graphNodes(html);
    expectPreservedNodes(nodes);
    const canonical = `https://gelato.education/courses/${slug}/lessons/1`;
    expect((await lessonMetadata({ params: Promise.resolve({ courseSlug: slug, lessonNumber: '1' }) })).alternates?.canonical).toBe(canonical);
    expectCrumbs(nodes, canonical,
      ['GELATO', course.title, 'Первый шаг в работе с ИИ: Claude Code с нуля'], `${canonical}#lesson`);
    expect(nodes.map((n) => n['@type'])).toEqual(expect.arrayContaining(['Course', 'LearningResource', 'VideoObject']));
  });

  it.each(['vibecoding', 'ai-cartoons', 'custom-course'])('лендинг %s берёт название из данных', async (courseSlug) => {
    vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([{ ...course, slug: courseSlug }]);
    const nodes = graphNodes(renderToStaticMarkup(await StructuredDataPage({ params: Promise.resolve({ path: ['courses', courseSlug] }) })));
    const canonical = `https://gelato.education/courses/${courseSlug}`;
    expect((await courseMetadata({ params: Promise.resolve({ courseSlug }) })).alternates?.canonical).toBe(canonical);
    expectCrumbs(nodes, canonical, ['GELATO', 'Курсы', course.title], `${canonical}#course`);
  });

  it.each([1, 2, 3, 4, 5])('урок claude-code/%i сохраняет свой граф без дублирования в корневом слоте', async (number) => {
    const lessonCourse = { ...course, slug: 'claude-code' };
    vi.mocked(resolveLesson).mockResolvedValue({ course: lessonCourse, lesson: course.lessons[0], number, publishedAt: '2026-11-12T00:00:00.000Z' });
    const params = Promise.resolve({ courseSlug: 'claude-code', lessonNumber: String(number) });
    const html = renderToStaticMarkup(<PaymentModalProvider>{await LessonPage({ params, searchParams: Promise.resolve({}) })}</PaymentModalProvider>);
    const slot = renderToStaticMarkup(await StructuredDataPage({ params: Promise.resolve({ path: ['courses', 'claude-code', 'lessons', String(number)] }) }));
    const canonical = `https://gelato.education/courses/claude-code/lessons/${number}`;
    expect((await lessonMetadata({ params })).alternates?.canonical).toBe(canonical);
    expectCrumbs([...graphNodes(slot), ...graphNodes(html)], canonical,
      ['GELATO', course.title, getLessonSeoContent('claude-code', number)!.h1], `${canonical}#lesson`);
  });

  it.each([1, 3, 4, 5, 6, 7])('урок vibecoding/%i без собственного JSON-LD использует существующий корневой граф', async (number) => {
    const lessonCourse = { ...course, slug: 'vibecoding' };
    const lesson = { ...course.lessons[0], number, title: `Название урока ${number} из данных` };
    vi.mocked(resolveLesson).mockResolvedValue({ course: lessonCourse, lesson, number, publishedAt: '2026-11-12T00:00:00.000Z' });
    const params = Promise.resolve({ courseSlug: 'vibecoding', lessonNumber: String(number) });
    const html = renderToStaticMarkup(<PaymentModalProvider>{await LessonPage({ params, searchParams: Promise.resolve({}) })}</PaymentModalProvider>);
    const slot = renderToStaticMarkup(await StructuredDataPage({ params: Promise.resolve({ path: ['courses', 'vibecoding', 'lessons', String(number)] }) }));
    const nodes = [...graphNodes(slot), ...graphNodes(html)];
    // This page gains a new BreadcrumbList; its original Organization/WebSite stay intact.
    if (number === 1) expectPreservedNodes(nodes.filter((node) => node['@type'] !== 'BreadcrumbList'));
    const canonical = `https://gelato.education/courses/vibecoding/lessons/${number}`;
    expect((await lessonMetadata({ params })).alternates?.canonical).toBe(canonical);
    expectCrumbs(nodes, canonical, ['GELATO', course.title, lesson.title]);
  });

  it.each([['claude-code', 2], ['claude-code-agents', 2], ['custom-course', 7]] as const)(
    'платный урок %s/%i использует корневой граф без LearningResource', async (courseSlug, number) => {
      const lessonCourse = { ...course, slug: courseSlug };
      const lesson = { ...course.lessons[0], number, title: `Название урока ${number} из данных`, access: 'paid' as const };
      vi.mocked(resolveLesson).mockResolvedValue({ course: lessonCourse, lesson, number, publishedAt: '2026-11-12T00:00:00.000Z' });
      const params = Promise.resolve({ courseSlug, lessonNumber: String(number) });
      const html = renderToStaticMarkup(<PaymentModalProvider>{await LessonPage({ params, searchParams: Promise.resolve({}) })}</PaymentModalProvider>);
      const slot = renderToStaticMarkup(await StructuredDataPage({ params: Promise.resolve({ path: ['courses', courseSlug, 'lessons', String(number)] }) }));
      const canonical = `https://gelato.education/courses/${courseSlug}/lessons/${number}`;
      expect((await lessonMetadata({ params })).alternates?.canonical).toBe(canonical);
      const nodes = [...graphNodes(slot), ...graphNodes(html)];
      expectCrumbs(nodes, canonical, ['GELATO', course.title, lesson.title]);
      expect(nodes.some((node) => node['@type'] === 'LearningResource')).toBe(false);
    },
  );

  it.each(BLOG_POSTS)('статья $slug: Главная → Блог → статья', async (post) => {
    const html = renderToStaticMarkup(await BlogPostPage({ params: Promise.resolve({ slug: post.slug }) }));
    const nodes = graphNodes(html);
    const canonical = blogPostUrl(post.slug);
    expect((await blogMetadata({ params: Promise.resolve({ slug: post.slug }) })).alternates?.canonical).toBe(canonical);
    expectCrumbs(nodes, canonical, ['GELATO', 'Блог', post.title], `${canonical}#article`);
    expect(nodes.map((n) => n['@type'])).toEqual(expect.arrayContaining(['Article', 'FAQPage']));
  });

  it('preserves Article and FAQ nodes independently of newly published posts', async () => {
    const post: BlogPost = {
      slug: 'schema-fixture', title: 'Название статьи из данных', lead: 'Введение',
      seoTitle: 'SEO title', seoDescription: 'Описание статьи',
      published: '2026-11-12', updated: '2026-11-13', topic: 'ИИ', body: 'Текст статьи.',
      faq: [{ question: 'Вопрос?', answer: 'Ответ.' }], lessonPath: null, cover: '/og-gelato.png',
    };
    vi.mocked(getBlogPost).mockReturnValueOnce(post);
    const nodes = graphNodes(renderToStaticMarkup(await BlogPostPage({ params: Promise.resolve({ slug: post.slug }) })));
    expectPreservedNodes(nodes);
    const canonical = blogPostUrl(post.slug);
    expectCrumbs(nodes, canonical, ['GELATO', 'Блог', post.title], `${canonical}#article`);
  });
});
