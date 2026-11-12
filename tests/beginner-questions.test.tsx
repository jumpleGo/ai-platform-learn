import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CourseWithLessons } from '@/lib/db/courses';
import SceneHome from '@/app/gelateria/page';
import ClassicHome from '@/app/(app)/(home)/page';
import CourseLanding from '@/app/(app)/courses/[courseSlug]/page';

const { catalog } = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/components/scene/gelateria-scene', () => ({
  GelateriaScene: () => <div data-scene="true"><h1>Школа GELATO</h1></div>,
}));
vi.mock('@/components/home-variant-analytics', () => ({ HomeVariantAnalytics: () => null }));
vi.mock('@/components/experiment-exposure', () => ({ ExperimentExposure: () => null }));
vi.mock('@/components/promo-banner', () => ({ PromoBanner: () => null }));
vi.mock('@/components/student-link', () => ({ StudentLink: () => null }));
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));
vi.mock('@/components/vibe-guest-cta', () => ({ VibeGuestCta: () => null }));

function fixture(slug = 'claude-code-agents', number = 1): CourseWithLessons {
  return {
    id: `document-${slug}`, slug, title: 'Курс для новичков', description: '',
    published: true, isTest: false, coverUrl: null, order: 1, access: 'paid',
    lessons: [{ id: 'intro', number, title: 'Вступление', description: '', access: 'free', published: true }],
  } as CourseWithLessons;
}

async function render(page: string, course = fixture()) {
  catalog.mockResolvedValue([course]);
  if (page === 'classic') return renderToStaticMarkup(await ClassicHome());
  if (page === 'control' || page === 'offer') {
    return renderToStaticMarkup(await SceneHome({ searchParams: Promise.resolve({ exp_home_offer: page }) }));
  }
  return renderToStaticMarkup(await CourseLanding({
    params: Promise.resolve({ courseSlug: course.slug! }),
    searchParams: Promise.resolve({ exp_agents_landing_blocks: page === 'agents-control' ? 'control' : page }),
  }));
}

function block(html: string) {
  const match = html.match(/<div\b[^>]*id="beginner-questions"[^>]*>([\s\S]*?)<\/div>/);
  expect(match, 'Q1–Q3 должны быть видимы на настоящей странице').not.toBeNull();
  return match![1];
}

const text = (html: string) => html.replace(/<[^>]*>/g, '').replaceAll('&#x27;', "'");

describe('GEO: прямые ответы Q1–Q3 на главной и вводном курсе', () => {
  it.each(['control', 'offer', 'classic', 'agents-control', 'core'])('показывает открытые ответы в начале страницы (%s)', async (page) => {
    const html = await render(page);
    const content = block(html);
    expect(content).not.toMatch(/<details|<summary|\bhidden\b/);
    const answers = [...content.matchAll(/<article\b[^>]*>\s*<h2\b[^>]*>(.*?)<\/h2>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/article>/g)];
    expect(answers).toHaveLength(3);
    expect(text(answers[0][1])).toMatch(/с чего начать ИИ с нуля/iu);
    expect(text(answers[1][1])).toMatch(/бесплатно.*ChatGPT.*без программирования/iu);
    expect(text(answers[2][1])).toMatch(/как работают нейросети/iu);
    for (const answer of answers) {
      const words = text(answer[2]).trim().split(/\s+/u).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(60);
    }
    const explanation = text(answers[2][2]);
    // Q3 объясняет обучение и создание ответа, а не перечисляет программу курса.
    expect(explanation).toMatch(/учится.*пример/iu);
    expect(explanation).toMatch(/(?:продолжение|следующ\S* слов)/iu);
    expect(explanation).toMatch(/(?:ошиб|выдум)/iu);
    const sentences = explanation.split(/(?<=[.!?])\s+/u);
    expect(sentences.slice(0, 3).join(' ')).not.toMatch(/курс|Gelato/iu);
    expect(content).toContain('Курс платный');
    expect(text(content)).not.toMatch(/бесплатн\S*\s+курс/iu);
    if (page === 'control' || page === 'offer') {
      expect(html.indexOf('id="beginner-questions"')).toBeLessThan(html.indexOf('data-scene'));
    } else if (page === 'classic') {
      expect(html.indexOf('id="beginner-questions"')).toBeLessThan(html.indexOf('id="about"'));
    } else {
      expect(html.indexOf('id="beginner-questions"')).toBeLessThan(html.indexOf('id="beginner-answers"'));
    }
  });

  it.each(['control', 'classic', 'agents-control'])('ссылка берёт slug и номер опубликованного бесплатного урока из каталога (%s)', async (page) => {
    const course = fixture('claude-code-agents', 3);
    course.lessons.unshift({ ...course.lessons[0], id: 'draft', number: 1, published: false });
    const href = block(await render(page, course)).match(/href="([^"]+)"/)![1];
    const url = new URL(href, 'https://gelato.education');
    expect(url.pathname).toBe(`/courses/${course.slug}/lessons/3`);
    expect(url.searchParams.get('from')).toBe('course_landing');
    expect(course.lessons.some((lesson) => lesson.number === 3 && lesson.published && lesson.access === 'free')).toBe(true);
  });

  it('ответы одинаковы в обоих вариантах home_offer и agents_landing_blocks', async () => {
    expect(block(await render('control'))).toBe(block(await render('offer')));
    expect(block(await render('agents-control'))).toBe(block(await render('core')));
  });

  it('не добавляет ответы вводного курса на другие лендинги', async () => {
    expect(await render('agents-control', fixture('vibecoding'))).not.toContain('id="beginner-questions"');
  });
});
