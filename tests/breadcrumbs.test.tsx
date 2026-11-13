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
function graphNodes(html: string): Node[] {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((match) => JSON.parse(match[1])['@graph'] as Node[]);
}

function expectPreservedNodes(nodes: Node[]) {
  // Captured on origin/main before the fix: Course, Article, FAQ and media
  // must stay identical when a WebPage links the existing breadcrumb.
  expect(nodes.filter((node) => !['BreadcrumbList', 'WebPage'].includes(String(node['@type'])))).toMatchSnapshot();
}

function expectCrumbs(nodes: Node[], canonical: string, names: string[], mainEntityId: string) {
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
  expect(pages[0]).toMatchObject({
    '@id': `${canonical}#webpage`, url: canonical, name: names[names.length - 1],
    breadcrumb: { '@id': lists[0]['@id'] }, mainEntity: { '@id': mainEntityId },
  });
  expect(nodes.some((node) => node['@id'] === mainEntityId)).toBe(true);
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

  it.each(BLOG_POSTS.slice(0, 3))('статья $slug: Главная → Блог → статья', async (post) => {
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
