/// <reference types="vite/client" />
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RootLayout from '@/app/layout';
import { COURSE_PAYMENT_CONFIGS } from '@/lib/payments/tariffs';
import { SiteStructuredData } from '@/components/site-structured-data';
import { CourseLead } from '@/components/course-lead';
import { buildFallbackLanding, getCourseLanding } from '@/lib/course-landings';

vi.mock('next/font/google', () => ({ Manrope: () => ({ variable: '' }) }));
vi.mock('next/font/local', () => ({ default: () => ({ variable: '' }) }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/navigation-progress', () => ({ NavigationProgress: () => null }));
vi.mock('@/components/dev/inline-text-editor', () => ({ InlineTextEditor: () => null }));
vi.mock('@/components/yandex-metrika', () => ({ YandexMetrika: () => null }));
vi.mock('@/components/tiktok-pixel', () => ({ TikTokPixel: () => null }));
vi.mock('@/lib/analytics/posthog-client', () => ({ PostHogProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/payment/payment-modal-context', () => ({ PaymentModalProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/lib/db/courses', () => ({
  resolveLesson: async () => null,
  getPublishedCoursesWithLessons: async () => ['vibecoding', 'claude-code-agents', 'ai-cartoons', 'claude-code'].map((slug) => ({
    id: slug, slug, title: slug, description: 'Уроки Claude Code для новичков.', lessons: [], isTest: false,
  })),
}));

// Отсутствующий слот на старом коде означает исходный граф только с организацией и сайтом.
const slots = import.meta.glob('../src/app/@structuredData/[...path]/page.tsx', { eager: true });
type Slot = { default: (props: { params: Promise<{ path?: string[] }> }) => Promise<React.ReactNode> };
const schemaSlot = Object.values(slots)[0] as Slot | undefined;

async function renderPage(path: string[]) {
  const structuredData = schemaSlot ? await schemaSlot.default({ params: Promise.resolve({ path }) }) : null;
  const slug = path[1];
  const landing = getCourseLanding(slug) ?? buildFallbackLanding({ title: slug, description: 'Уроки Claude Code для новичков.', isTest: false }, []);
  const children = <main><p><CourseLead slug={slug} lead={landing.lead} /></p></main>;
  const html = renderToStaticMarkup(RootLayout({ children, ...{ structuredData } }));
  const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return { html, graphs: scripts.map((match) => JSON.parse(match[1])) };
}

describe('Course в существующем графе страницы', () => {
  it.each(['vibecoding', 'claude-code-agents', 'ai-cartoons', 'claude-code'])('%s: JSON-LD парсится, содержит Course и единственного provider', async (slug) => {
    const { html, graphs } = await renderPage(['courses', slug]);
    expect(graphs).toHaveLength(1);
    expect(graphs[0]['@context']).toBe('https://schema.org');
    const graph = graphs[0]['@graph'];
    const course = graph.find((node: Record<string, unknown>) => node['@type'] === 'Course');
    expect(course, `${slug}: Course отсутствует`).toBeDefined();
    expect(course).toMatchObject({
      name: expect.any(String), description: expect.any(String), inLanguage: 'ru',
      educationalLevel: 'beginner', hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
    });
    expect(course.name.length).toBeGreaterThan(0);
    expect(course.description.length).toBeGreaterThan(0);
    const visibleText = html.match(/<main>([\s\S]*?)<\/main>/)![1].replace(/<[^>]*>/g, '');
    expect(visibleText).toBe(course.description);
    const organizations = graph.filter((node: Record<string, unknown>) => {
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
      return types.includes('Organization') || types.includes('EducationalOrganization');
    });
    expect(organizations).toHaveLength(1);
    expect(course.provider).toEqual({ '@id': organizations[0]['@id'] });
    expect(course.provider['@id']).toBe('https://gelato.education/#organization');
    expect(JSON.stringify(graph)).not.toMatch(/"isAccessibleForFree"|"(?:price|lowPrice|highPrice)":(?:0|"0")(?=[,}])/);
    const prices = COURSE_PAYMENT_CONFIGS[slug]?.tariffs.map((tariff) => tariff.price);
    if (prices?.length) {
      expect(course.offers).toMatchObject({
        '@type': 'AggregateOffer', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), priceCurrency: 'RUB',
      });
    } else {
      expect(course).not.toHaveProperty('offers');
    }
  });

  it('один тариф даёт Offer из данных; экранирование сохраняет JSON и не закрывает script', () => {
    const config = COURSE_PAYMENT_CONFIGS['ai-cartoons'];
    const tariffs = config.tariffs;
    let html: string;
    try {
      config.tariffs = [tariffs[0]];
      html = renderToStaticMarkup(<SiteStructuredData course={{ slug: 'ai-cartoons', name: 'Курс', description: '</script><script>alert(1)</script>' }} />);
    } finally {
      config.tariffs = tariffs;
    }
    const data = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
    const course = data['@graph'].find((node: Record<string, unknown>) => node['@type'] === 'Course');
    expect(course.offers).toEqual({ '@type': 'Offer', price: config.tariffs[0].price, priceCurrency: 'RUB' });
    expect(course.description).toBe('</script><script>alert(1)</script>');
    expect(html.match(/<script/g)).toHaveLength(1);
  });

  it.each([[], ['blog', 'kak-sekonomit-na-ii'], ['courses'], ['courses', 'claude-code', 'lessons', '2'], ['courses', 'missing']])('обычный граф для %j', async (...segments) => {
    const { graphs } = await renderPage(segments as string[]);
    expect(graphs).toHaveLength(1);
    expect(graphs[0]['@graph'].map((node: Record<string, unknown>) => node['@type'])).toEqual([
      ['EducationalOrganization', 'Organization'], 'WebSite',
    ]);
  });
});
