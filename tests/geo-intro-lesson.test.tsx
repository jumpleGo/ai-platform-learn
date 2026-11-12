import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LessonPage, { generateMetadata } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page';
import { SiteStructuredData } from '@/components/site-structured-data';
import { PaymentModalProvider } from '@/components/payment/payment-modal-context';
import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
import { getFreeLessonContent } from '@/lib/free-lessons';
import { COURSE_PAYMENT_CONFIGS } from '@/lib/payments/tariffs';

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
vi.mock('@/components/payment/locked-video-player', () => ({ LockedVideoPlayer: () => null }));

const slug = 'claude-code-agents';
const canonical = `https://gelato.education/courses/${slug}/lessons/1`;
const title = 'Claude Code с нуля: бесплатный вводный урок — GELATO';
const description = 'Бесплатный вводный урок для тех, кто ещё не работал с ИИ. Узнайте, что такое Claude Code и как начать решать свои задачи с его помощью без опыта программирования.';
const course: CourseWithLessons = {
  id: 'agents-course', slug, title: 'Claude Code — свои агенты', description: '',
  access: 'paid', published: true, isTest: false, coverUrl: null, order: 0,
  testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
  highlightBackground: false, clickCount: 0,
  lessons: [1, 2].map((number) => ({
    id: `lesson-${number}`, courseId: 'agents-course', number,
    title: number === 1 ? 'Вступление' : 'Закрытый урок',
    description: number === 1 ? '' : 'Описание закрытого урока',
    access: number === 1 ? 'free' : 'paid', published: true,
    videoEmbedUrl: '', durationSec: 60, order: number, views: 0,
    materials: number === 1 ? '' : '## Оглавление\n\nPRIVATE_LESSON_BODY',
    previewImageUrl: null, marketingVariants: [], relatedVariants: [],
    coverCaption: null, hideHeader: false, hideFooter: false,
    hideBackLink: false, hideLessonsNav: false, marketingHtml: null, relatedHtml: null,
  })),
};

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([course]);
  vi.mocked(resolveLesson).mockImplementation(async (key, number) => {
    const lesson = course.lessons.find((item) => String(item.number) === number || item.id === number);
    return [slug, course.id].includes(key) && lesson
      ? { course, lesson, number: lesson.number, publishedAt: '2026-11-12T00:00:00.000Z' }
      : null;
  });
});

function props(lessonNumber = '1', courseSlug = slug) {
  return { params: Promise.resolve({ courseSlug, lessonNumber }), searchParams: Promise.resolve({}) };
}

async function renderedLesson(number = '1') {
  const html = renderToStaticMarkup(
    <PaymentModalProvider>{SiteStructuredData({})}{await LessonPage(props(number))}</PaymentModalProvider>,
  );
  const graphs = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  return { html, graphs, nodes: graphs.flatMap((graph) => graph['@graph']) as Record<string, unknown>[] };
}

describe('GEO: бесплатное вступление в платную программу', () => {
  it('даёт понятные title и description, включая старый адрес с ID документов', async () => {
    for (const pageProps of [props(), props('lesson-1', course.id)]) {
      const metadata = await generateMetadata(pageProps);
      expect(metadata).toMatchObject({
        title, description, alternates: { canonical },
        openGraph: { title, description, url: canonical },
        twitter: { title, description },
      });
      expect(metadata.description).not.toMatch(/промпт|вайбкод|MCP|скилл|токен|бесплатн\S* курс/i);
    }
  });

  it('рендерит LearningResource внутри графа урока и ссылается на единственную организацию', async () => {
    const { html, graphs, nodes } = await renderedLesson();
    const lessonGraph = graphs.find((graph) => graph['@graph'].some((node: Record<string, unknown>) => node['@type'] === 'LearningResource'));
    expect(lessonGraph, 'LearningResource отсутствует на /lessons/1').toBeDefined();
    expect(lessonGraph['@context']).toBe('https://schema.org');
    expect(lessonGraph['@graph'].map((node: Record<string, unknown>) => node['@type']))
      .toEqual(['Course', 'LearningResource', 'VideoObject']);
    const resource = nodes.find((node) => node['@type'] === 'LearningResource');
    const courseNode = nodes.find((node) => node['@type'] === 'Course')!;
    const organizations = nodes.filter((node) => Array.isArray(node['@type']) && node['@type'].includes('Organization'));
    expect(organizations).toHaveLength(1);
    expect(resource).toMatchObject({
      '@id': `${canonical}#lesson`, url: canonical, description,
      name: 'Первый шаг в работе с ИИ: Claude Code с нуля',
      isAccessibleForFree: true, educationalLevel: 'Начальный',
      provider: { '@id': organizations[0]['@id'] },
      isPartOf: { '@id': courseNode['@id'] },
      associatedMedia: { '@id': `${canonical}#video` },
    });
    expect(html).toContain('Первый шаг в работе с ИИ: Claude Code с нуля');
    expect(courseNode).not.toHaveProperty('isAccessibleForFree');
    expect(courseNode.provider).toEqual({ '@id': 'https://gelato.education/#organization' });
    const prices = COURSE_PAYMENT_CONFIGS[slug].tariffs.map((tariff) => tariff.price);
    expect(courseNode.offers).toMatchObject({
      '@type': 'AggregateOffer', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), priceCurrency: 'RUB',
    });
    expect(courseNode['@id']).toBe('https://gelato.education/courses/claude-code-agents#course');
    expect(JSON.stringify(courseNode)).not.toMatch(/бесплатн\S* курс|"(?:price|lowPrice|highPrice)":0(?=[,}])/i);
  });

  it('сохраняет платный урок закрытым и не помечает его бесплатным ресурсом', async () => {
    const { html, nodes } = await renderedLesson('2');
    expect(nodes.some((node) => node['@type'] === 'LearningResource')).toBe(false);
    expect(html).not.toContain('PRIVATE_LESSON_BODY');
    expect((await generateMetadata(props('2'))).description).toBe('Описание закрытого урока');
    expect(getFreeLessonContent(slug, 1)).toBeNull();
  });
});
