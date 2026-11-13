import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';
import StructuredDataPage from '@/app/@structuredData/[...path]/page';
import { getCourseLanding } from '@/lib/course-landings';
import type { CourseWithLessons } from '@/lib/db/courses';

const { catalog } = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
// Keep the real landing and schema; isolate external services and payment UI.
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));
vi.mock('@/components/vibe-guest-cta', () => ({ VibeGuestCta: () => null }));
vi.mock('@/components/experiment-exposure', () => ({ ExperimentExposure: () => null }));

function fixture(slug = 'vibecoding', count = 7): CourseWithLessons {
  return {
    id: `document-${slug}`, slug, title: 'Курс', description: 'Практические уроки.',
    published: true, isTest: false, coverUrl: null, order: 1, access: 'paid',
    lessons: [
      ...Array.from({ length: count }, (_, i) => ({
        id: `lesson-${i}`, number: i + 1, title: `Урок ${i + 1}`, description: '',
        access: i === 0 ? 'free' : 'paid', published: true,
      })),
      { id: 'draft', number: 100, title: 'Черновик', published: false, access: 'paid' },
      { id: 'test', number: 101, title: 'Тест', published: true, isTest: true, access: 'paid' },
    ],
  } as CourseWithLessons;
}

const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();
const visibleText = (html: string) => normalize(html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<[^>]*>/g, ''));

async function render(course = fixture()) {
  catalog.mockResolvedValue([course]);
  const html = renderToStaticMarkup(await CourseLandingPage({
    params: Promise.resolve({ courseSlug: course.slug! }),
    searchParams: Promise.resolve({}),
  }));
  return { html, text: visibleText(html) };
}

describe('honest published lesson count', () => {
  it.each(['vibecoding', 'it-vibecoding'])('%s counts seven published lessons, excluding drafts and tests', async (slug) => {
    const { html, text } = await render(fixture(slug));
    expect(text).toContain('Опубликовано уроков: 7. Новые выходят.');
    expect(text).not.toMatch(/17\s+урок/u);
    expect(html).toMatch(/<dt\b[^>]*>7<\/dt>/u);
  });

  it('updates the promise when another lesson is published', async () => {
    const { text } = await render(fixture('vibecoding', 8));
    expect(text).toContain('Опубликовано уроков: 8. Новые выходят.');
    expect(text).not.toContain('Опубликовано уроков: 7.');
  });

  it.each([false, true])('does not count unavailable lessons (test course: %s)', async (isTest) => {
    const course = fixture('vibecoding', isTest ? 7 : 0);
    course.isTest = isTest;
    expect((await render(course)).text).toContain('Опубликовано уроков: 0. Новые выходят.');
  });

  it('preserves the catalog convention for legacy published lessons', async () => {
    const course = fixture();
    delete (course.lessons[0] as { published?: boolean }).published;
    expect((await render(course)).text).toContain('Опубликовано уроков: 7. Новые выходят.');
  });

  it.each([7, 8])('uses the supplied count in editorial facts, format and inclusions (%s)', (count) => {
    const landing = getCourseLanding('vibecoding', count)!;
    expect(landing.facts.some((fact) => fact.value === String(count))).toBe(true);
    expect(normalize(landing.format[0].note)).toContain(`Опубликовано уроков: ${count}.`);
    expect(normalize(landing.price.includes.join(' '))).toContain(`Опубликовано уроков: ${count}.`);
    expect(JSON.stringify(landing)).not.toMatch(/17(?:\s|\\u00a0)*урок/u);
  });
});

describe('course-specific FAQ and structured data', () => {
  it('cartoons has no vibecoding or agents FAQ', async () => {
    const { text } = await render(fixture('ai-cartoons'));
    expect(text).not.toContain('Как проходит обучение: вопросы и ответы');
    expect(text).not.toContain('Курс привязан к Claude Code?');
    expect(text).not.toContain('Что внутри обучения и в каком порядке идём?');
  });

  it('vibecoding keeps its own FAQ', async () => {
    const { text } = await render();
    expect(text).toContain('Как и когда открывается доступ к материалам?');
    expect(text).toContain('Курс привязан к Claude Code?');
  });

  it.each(['vibecoding', 'claude-code-agents', 'ai-cartoons', 'claude-code'])('%s retains valid Course and only its visible FAQ', async (slug) => {
    const { html, text } = await render(fixture(slug));
    const schema = renderToStaticMarkup(await StructuredDataPage({
      params: Promise.resolve({ path: ['courses', slug] }),
    }));
    const nodes = [...(schema + html).matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap((match) => {
        const data = JSON.parse(match[1]);
        expect(data['@context']).toBe('https://schema.org');
        return data['@graph'] ?? [data];
      });
    const courses = nodes.filter((node) => node['@type'] === 'Course');
    expect(courses).toHaveLength(1);
    expect(courses[0]).toMatchObject({
      name: expect.any(String), description: expect.any(String),
      provider: { '@id': 'https://gelato.education/#organization' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
    });
    expect(courses[0].description.length).toBeGreaterThan(0);
    const faqs = nodes.filter((node) => node['@type'] === 'FAQPage');
    expect(faqs).toHaveLength(slug === 'claude-code-agents' ? 1 : 0);
    for (const faq of faqs) {
      expect(faq.mainEntity).toHaveLength(12);
      for (const item of faq.mainEntity) {
        expect(item['@type']).toBe('Question');
        expect(item.acceptedAnswer['@type']).toBe('Answer');
        expect(item.acceptedAnswer.text.length).toBeGreaterThan(0);
        expect(text).toContain(normalize(item.name));
        expect(text).toContain(normalize(item.acceptedAnswer.text));
      }
    }
  });
});
