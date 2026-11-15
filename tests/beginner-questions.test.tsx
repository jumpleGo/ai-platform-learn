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
  expect(match, 'Q1–Q3 должны присутствовать в HTML настоящей страницы').not.toBeNull();
  return match![1];
}

const text = (html: string) => html.replace(/<[^>]*>/g, '').replaceAll('&#x27;', "'");

describe('#214: на обеих главных ответов Q1–Q3 нет', () => {
  it.each(['control', 'offer', 'classic'])('блок ответов отсутствует (%s)', async (page) => {
    const html = await render(page);
    expect(html).not.toContain('id="beginner-questions"');
    expect(html).not.toContain('Ответы новичкам об ИИ');
    expect(text(html)).not.toMatch(/с чего начать ИИ с нуля|как работают нейросети/iu);
  });
});

describe('GEO: прямые ответы Q1–Q3 на вводном курсе (лендинг сохранён)', () => {
  it.each(['agents-control', 'core'])('сохраняет ответы в закрытых details после первого экрана (%s)', async (page) => {
    const html = await render(page);
    const content = block(html);
    expect(content).not.toMatch(/\bhidden\b/);
    const details = [...content.matchAll(/<details\b([^>]*)>\s*<summary\b[^>]*>(.*?)<\/summary>([\s\S]*?)<\/details>/g)];
    expect(details).toHaveLength(6);
    for (const [, attributes] of details) expect(attributes).not.toMatch(/(?:^|\s)open(?:\s|=|$)/);
    // У общего вопроса два абзаца: сохраняем проверки исходных ответов Q1–Q3.
    const answers = details.flatMap(([, , question, body]) =>
      [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(([, answer]) => [question, answer]),
    ).filter(([, answer]) => /^(?:Начните с одной небольшой задачи:|Учиться пользоваться ChatGPT можно|Нейросеть учится на множестве примеров:)/u.test(text(answer)));
    expect(answers).toHaveLength(3);
    expect(text(answers[0][0])).toMatch(/с чего начать ИИ с нуля/iu);
    expect(text(answers[1][0])).toMatch(/бесплатно.*ChatGPT.*без программирования/iu);
    expect(text(answers[2][0])).toMatch(/как работают нейросети/iu);
    for (const answer of answers) {
      const words = text(answer[1]).trim().split(/\s+/u).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(60);
    }
    const explanation = text(answers[2][1]);
    // Q3 объясняет обучение и создание ответа, а не перечисляет программу курса.
    expect(explanation).toMatch(/учится.*пример/iu);
    expect(explanation).toMatch(/(?:продолжение|следующ\S* слов)/iu);
    expect(explanation).toMatch(/(?:ошиб|выдум)/iu);
    const sentences = explanation.split(/(?<=[.!?])\s+/u);
    expect(sentences.slice(0, 3).join(' ')).not.toMatch(/курс|Gelato/iu);
    expect(content).toContain('Курс платный');
    expect(text(content)).not.toMatch(/бесплатн\S*\s+курс/iu);
    expect(html.indexOf('id="beginner-questions"')).toBeGreaterThan(html.indexOf('id="beginner-answers"'));
  });

  it.each(['agents-control'])('ссылка берёт slug и номер опубликованного бесплатного урока из каталога (%s)', async (page) => {
    const course = fixture('claude-code-agents', 3);
    course.lessons.unshift({ ...course.lessons[0], id: 'draft', number: 1, published: false });
    const href = block(await render(page, course)).match(/href="([^"]+)"/)![1];
    const url = new URL(href, 'https://gelato.education');
    expect(url.pathname).toBe(`/courses/${course.slug}/lessons/3`);
    expect(url.searchParams.get('from')).toBe('course_landing');
    expect(course.lessons.some((lesson) => lesson.number === 3 && lesson.published && lesson.access === 'free')).toBe(true);
  });

  it('ответы одинаковы в обоих вариантах agents_landing_blocks', async () => {
    expect(block(await render('agents-control'))).toBe(block(await render('core')));
  });

  it('не добавляет ответы вводного курса на другие лендинги', async () => {
    expect(await render('agents-control', fixture('vibecoding'))).not.toContain('id="beginner-questions"');
  });
});
