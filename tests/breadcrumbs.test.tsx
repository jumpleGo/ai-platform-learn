import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LessonPage from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import BlogPostPage from '@/app/(app)/blog/[slug]/page';
import StructuredDataPage from '@/app/@structuredData/[...path]/page';
import { PaymentModalProvider } from '@/components/payment/payment-modal-context';
import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
vi.mock('@/components/payment/locked-video-player', () => ({ LockedVideoPlayer: () => null }));

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

function expectCrumbs(nodes: Node[], canonical: string, names: string[]) {
  const lists = nodes.filter((node) => node['@type'] === 'BreadcrumbList');
  expect(lists, 'BreadcrumbList отсутствует или не один').toHaveLength(1);
  const items = lists[0].itemListElement as { position: number; name: string; item: string }[];
  expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
  expect(items.map((i) => i.name)).toEqual(names);
  expect(items[0].item).toBe('https://gelato.education');
  items.forEach((i) => expect(i.item).toMatch(/^https:\/\/gelato\.education/));
  expect(items[items.length - 1].item).toBe(canonical);
  expect(canonical).not.toContain('?');
  expect(lists[0]['@id']).toBe(`${canonical}#breadcrumb`);
}

describe('BreadcrumbList в существующем @graph', () => {
  it('лендинг курса: Главная → Курсы → курс', async () => {
    const html = renderToStaticMarkup(await StructuredDataPage({ params: Promise.resolve({ path: ['courses', slug] }) }));
    const nodes = graphNodes(html);
    expectCrumbs(nodes, `https://gelato.education/courses/${slug}`, ['GELATO', 'Курсы', course.title]);
    expect(nodes.some((n) => n['@type'] === 'Course')).toBe(true);
  });

  it('урок claude-code-agents/lessons/1: Главная → курс → урок', async () => {
    const html = renderToStaticMarkup(
      <PaymentModalProvider>{await LessonPage({ params: Promise.resolve({ courseSlug: slug, lessonNumber: '1' }), searchParams: Promise.resolve({}) })}</PaymentModalProvider>,
    );
    const nodes = graphNodes(html);
    expectCrumbs(nodes, `https://gelato.education/courses/${slug}/lessons/1`,
      ['GELATO', course.title, 'Первый шаг в работе с ИИ: Claude Code с нуля']);
    expect(nodes.map((n) => n['@type'])).toEqual(expect.arrayContaining(['Course', 'LearningResource', 'VideoObject']));
  });

  it.each(BLOG_POSTS.slice(0, 3))('статья $slug: Главная → Блог → статья', async (post) => {
    const html = renderToStaticMarkup(await BlogPostPage({ params: Promise.resolve({ slug: post.slug }) }));
    const nodes = graphNodes(html);
    expectCrumbs(nodes, blogPostUrl(post.slug), ['GELATO', 'Блог', post.title]);
    expect(nodes.map((n) => n['@type'])).toEqual(expect.arrayContaining(['Article', 'FAQPage']));
  });
});
