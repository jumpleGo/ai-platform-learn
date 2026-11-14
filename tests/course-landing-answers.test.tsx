import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CourseWithLessons } from '@/lib/db/courses';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';

// Рендерим настоящую серверную страницу; БД, сессия и интерактивные CTA
// заменены, чтобы проверка не требовала ключей и не отправляла события.
const { catalog } = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));
vi.mock('@/components/vibe-guest-cta', () => ({ VibeGuestCta: () => null }));
vi.mock('@/components/experiment-exposure', () => ({ ExperimentExposure: () => null }));

function courseFixture(slug: string): CourseWithLessons {
  return {
    id: `document-${slug}`, slug, title: 'Курс для новичков', description: '',
    published: true, isTest: false, coverUrl: null, order: 1, access: 'paid',
    lessons: [{ id: 'intro', number: 1, title: 'Вступление', access: 'free', published: true }],
  } as CourseWithLessons;
}

// Повторные проверки используют тот же HTML стандартной фикстуры. Изменённые
// данные курса всегда рендерим заново, чтобы проверить выбор бесплатного урока.
const defaultLandings = new Map<string, string>();

async function renderLanding(slug = 'claude-code-agents', variant = 'control', course?: CourseWithLessons) {
  catalog.mockResolvedValue([course ?? courseFixture(slug)]);
  const cacheKey = `${slug}:${variant}`;
  if (!course && defaultLandings.has(cacheKey)) return defaultLandings.get(cacheKey)!;
  const html = renderToStaticMarkup(await CourseLandingPage({
    params: Promise.resolve({ courseSlug: slug }),
    searchParams: Promise.resolve({ exp_agents_landing_blocks: variant }),
  }));
  if (!course) defaultLandings.set(cacheKey, html);
  return html;
}

function answersBlock(html: string) {
  const block = html.match(/<section\b[^>]*id="beginner-answers"[^>]*>([\s\S]*?)<\/section>/);
  expect(block, 'Свёрнутые ответы должны находиться сразу после первого экрана').not.toBeNull();
  return block![1];
}

function faqPages(html: string) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      const data = JSON.parse(match[1]);
      return data['@graph'] ?? [data];
    })
    .filter((item) => item['@type'] === 'FAQPage');
}

describe('Свёрнутые ответы новичкам на лендинге Claude Code', () => {
  beforeAll(async () => {
    for (const variant of ['control', 'core']) {
      await renderLanding('claude-code-agents', variant);
    }
  });

  it.each(['control', 'core'])('сохраняет 7 ответов по 40–60 слов в 6 закрытых details после первого экрана (%s)', async (variant) => {
    const html = await renderLanding('claude-code-agents', variant);
    const block = answersBlock(html);
    expect(html.indexOf('id="beginner-answers"')).toBeGreaterThan(html.indexOf('</section>'));
    expect(html.slice(html.indexOf('</section>') + '</section>'.length)).toMatch(/^\s*<section[^>]*id="beginner-answers"/);
    expect(block).not.toMatch(/\bhidden\b/);
    const details = [...block.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
    expect(details).toHaveLength(6);
    for (const [, attributes] of details) expect(attributes).not.toMatch(/(?:^|\s)open(?:\s|=|$)/);
    expect([...block.matchAll(/<summary\b/g)]).toHaveLength(6);
    const paragraphs = details.flatMap(([, , content]) => [...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]);
    expect(paragraphs).toHaveLength(7);
    for (const [, paragraph] of paragraphs) {
      const words = paragraph.replace(/<[^>]*>/g, '').trim().split(/\s+/u).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(60);
    }
    expect(block).toContain('Курс платный');
    expect(block).not.toMatch(/бесплатн\S* курс/iu);
  });

  // Проверяем ссылку нового блока ответов; CTA первого экрана исправляет задача #71.
  it('ссылка блока ответов ведёт к опубликованному бесплатному уроку текущего курса', async () => {
    const block = answersBlock(await renderLanding());
    const links = [...block.matchAll(/href="([^"]+)"[^>]*>\s*бесплатный вводный урок/g)];
    for (const [, href] of links) {
      const url = new URL(href, 'https://gelato.education');
      const [, slug, number] = url.pathname.match(/^\/courses\/([^/]+)\/lessons\/(\d+)$/)!;
      const course = (await catalog()).find((item: CourseWithLessons) => item.slug === slug);
      expect(course, `Курс из ${href} должен существовать`).toBeDefined();
      expect(course.lessons.find((lesson: { number: number; access: string; published: boolean }) =>
        lesson.number === Number(number) && lesson.published && lesson.access === 'free')).toBeDefined();
      expect(url.searchParams.get('from')).toBe('course_landing');
    }
    expect(links).toHaveLength(1);
  });

  it('блок ответов берёт номер бесплатного урока из данных, даже если это не первый урок', async () => {
    const course = courseFixture('claude-code-agents');
    course.lessons[0].number = 3;
    const block = answersBlock(await renderLanding(course.slug, 'control', course));
    expect(block).toContain('href="/courses/claude-code-agents/lessons/3?from=course_landing"');
    expect(block).not.toContain('/lessons/1?from=course_landing');
  });

  it.each(['control', 'core'])('содержит один FAQPage с видимыми ответами и 12 уникальными вопросами (%s)', async (variant) => {
    const html = await renderLanding('claude-code-agents', variant);
    const [faq] = faqPages(html);
    expect(faqPages(html)).toHaveLength(1);
    expect(faq.mainEntity).toHaveLength(12);
    expect(new Set(faq.mainEntity.map((item: { name: string }) => item.name)).size).toBe(12);
    const block = answersBlock(html);
    const headings = [...block.matchAll(/<summary\b[^>]*>(.*?)<\/summary>/g)]
      .map((match) => match[1])
      .filter((question) => faq.mainEntity.some((item: { name: string }) => item.name === question));
    // Четыре исходных вопроса FAQ остаются среди шести объединённых вопросов.
    expect(headings).toHaveLength(4);
    for (const question of headings) {
      const item = faq.mainEntity.find((item: { name: string }) => item.name === question);
      expect(item).toBeDefined();
      expect(block).toContain(item.acceptedAnswer.text);
    }
    if (process.env.GEO_MEASURE === '1' && variant === 'control') {
      const words = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
        .map((match) => match[1].replace(/<[^>]*>/g, '').trim().split(/\s+/u).length);
      process.stdout.write(`QUESTIONS=${headings.length}\nWORDS=${words.join(',')}\nFAQPAGE_COUNT=${faqPages(html).length}\n`);
    }
  });

  it('одинаково рендерит новый блок и FAQ-разметку в обоих вариантах A/B', async () => {
    const control = await renderLanding('claude-code-agents', 'control');
    const core = await renderLanding('claude-code-agents', 'core');
    expect(answersBlock(control)).toBe(answersBlock(core));
    expect(faqPages(control)).toEqual(faqPages(core));
    if (process.env.GEO_MEASURE === '1') process.stdout.write('AB_NEUTRAL=yes\n');
  });

  it.each(['vibecoding', 'other-course'])('не добавляет блок или FAQPage другому курсу (%s)', async (slug) => {
    const html = await renderLanding(slug);
    expect(html).not.toContain('id="beginner-answers"');
    expect(faqPages(html)).toHaveLength(0);
  });
});
