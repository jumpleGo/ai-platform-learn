import React, { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import posthog from 'posthog-js';
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
vi.mock('posthog-js', () => ({ default: { __loaded: true, capture: vi.fn() } }));

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
  vi.mocked(posthog.capture).mockClear();
  vi.mocked(getPublishedCoursesWithLessons).mockClear();
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

async function renderedLesson(number = '1', courseSlug = slug) {
  const page = await LessonPage(props(number, courseSlug));
  const html = renderToStaticMarkup(
    <PaymentModalProvider>{SiteStructuredData({})}{page}</PaymentModalProvider>,
  );
  const graphs = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  return { page, html, graphs, nodes: graphs.flatMap((graph) => graph['@graph']) as Record<string, unknown>[] };
}

type ClickLink = { href?: string; onClick?: () => void; children?: ReactNode };
function nextStepLink(node: ReactNode): ReactElement<ClickLink> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<ClickLink>(child)) continue;
    if (child.props.href === '/courses/claude-code-agents' && child.props.onClick) return child;
    const subtree = typeof child.type === 'function' && child.type.name === 'AgentsIntroNextStep'
      ? (child.type as () => ReactNode)() : child.props.children;
    const link = nextStepLink(subtree);
    if (link) return link;
  }
}

describe('следующий шаг после вступления (#239)', () => {
  it('показывает один блок и одну кнопку после материалов вводного урока', async () => {
    vi.mocked(resolveLesson).mockResolvedValue({
      course, lesson: { ...course.lessons[0], materials: 'INTRO MATERIALS END' },
      number: 1, publishedAt: '2026-11-12T00:00:00Z',
    });
    const { html } = await renderedLesson();
    const blocks = [...html.matchAll(/<section\b[^>]*data-lesson-next-step="course"[\s\S]*?<\/section>/g)];
    expect(blocks).toHaveLength(1);
    const block = blocks[0][0];
    expect(html.indexOf(block)).toBeGreaterThan(html.indexOf('INTRO MATERIALS END'));
    expect(block.match(/<a\b/g)).toHaveLength(1);
    expect(block).toContain('href="/courses/claude-code-agents"');
    expect(block).toContain('Посмотреть программу и цены');
    expect(html).toContain('INTRO MATERIALS END');
    expect(block).not.toMatch(/бесплатн\p{L}*\s+курс|MCP|скилл|промпт/iu);
    expect(getPublishedCoursesWithLessons).not.toHaveBeenCalled();
  });

  it('отправляет lesson_next_click через PostHog только при клике', async () => {
    const { page } = await renderedLesson();
    const link = nextStepLink(page);
    expect(link, 'кнопка следующего шага отсутствует').toBeDefined();
    expect(posthog.capture).not.toHaveBeenCalled();
    link!.props.onClick!();
    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('lesson_next_click', {
      course: slug, lesson: 1, target: 'course',
    });
  });

  it.each([
    [slug, 2, 'paid'], [slug, 2, 'free'], [slug, 1, 'paid'], ['another-course', 1, 'free'],
  ] as const)('не меняет урок %s/%s с доступом %s', async (courseSlug, number, access) => {
    vi.mocked(resolveLesson).mockResolvedValue({
      course: { ...course, slug: courseSlug },
      lesson: { ...course.lessons[number - 1], access }, number,
      publishedAt: '2026-11-12T00:00:00Z',
    });
    const { html } = await renderedLesson(String(number), courseSlug);
    expect(html).not.toContain('data-lesson-next-step=');
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

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
      .toEqual(['Course', 'LearningResource', 'VideoObject', 'BreadcrumbList']);
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
