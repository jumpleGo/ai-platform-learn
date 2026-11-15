import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import FreePage from '@/app/(app)/free/page';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';
import type { CourseWithLessons } from '@/lib/db/courses';
import * as tariffData from '@/lib/payments/tariffs';
import old from './fixtures/text-blocks-2557bec.json';

// Real server markup, with no database, session or analytics requests.
vi.mock('@/lib/db/courses', () => ({
  getPublishedCoursesWithLessons: async () => [{
    id: 'vibe-document', slug: 'vibecoding', title: 'Курс', description: '',
    published: true, isTest: false, coverUrl: null, order: 1, access: 'paid',
    lessons: [],
  } as unknown as CourseWithLessons, {
    id: 'agents-document', slug: 'claude-code-agents', title: 'Курс', description: '',
    published: true, isTest: false, coverUrl: null, order: 2, access: 'paid',
    lessons: [],
  } as unknown as CourseWithLessons],
}));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));
vi.mock('@/components/vibe-guest-cta', () => ({ VibeGuestCta: () => null }));
vi.mock('@/components/experiment-exposure', () => ({ ExperimentExposure: () => null }));
vi.mock('@/lib/analytics/track-client', () => ({ track: vi.fn() }));

const MAX_WORDS = 40;
const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
const words = (text: string) => text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

afterEach(() => vi.restoreAllMocks());

function assertBudget(text: string) {
  expect(words(text)).toBeGreaterThan(0);
  expect(words(text)).toBeLessThanOrEqual(MAX_WORDS);
}

async function freeMarkup() {
  return renderToStaticMarkup(await FreePage({}));
}

async function courseMarkup(courseSlug = 'vibecoding') {
  return renderToStaticMarkup(await CourseLandingPage({
    params: Promise.resolve({ courseSlug }),
    searchParams: Promise.resolve({ exp_vibe_landing_pairs: 'control' }),
  }));
}

function freeAnswer(html: string) {
  // Include every introductory paragraph/card up to the existing lesson CTA.
  const match = html.match(/<\/h1>([\s\S]*?)<a\b/);
  expect(match).not.toBeNull();
  return visibleText(match![1]);
}

function homeworkAnswer(html: string) {
  const details = [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)]
    .find((match) => match[1].includes('Как устроена обратная связь и помощь автора?'));
  expect(details).toBeDefined();
  return visibleText(details![1].split('</summary>')[1]);
}

describe('task 528: readable text blocks', () => {
  it('/free: the entire answer has at most 40 words', async () => {
    assertBudget(freeAnswer(await freeMarkup()));
  });

  it('homework: the expanded answer has at most 40 words', async () => {
    assertBudget(homeworkAnswer(await courseMarkup()));
  });

  it('retains the introductory facts and tools', async () => {
    const text = freeAnswer(await freeMarkup());
    for (const fact of ['Бесплатные', 'нейросетям', 'на русском', 'с нуля', 'контекст', 'выдумывает', 'Опыт и установка программ не нужны', 'Один принцип за урок', 'порядок любой', 'Claude', 'ChatGPT', 'Gemini']) {
      expect(text).toContain(fact);
    }
  });

  it('retains homework review, private support and help with any learning question', async () => {
    const text = homeworkAnswer(await courseMarkup()).replace(/\s+/gu, ' ');
    const support = tariffData.getTariffsForCourse('vibecoding')
      .find((tariff) => tariff.hasSupport)!.features.find((feature) => feature.includes('Telegram'))!;
    expect(support).toBeTruthy();
    for (const fact of ['В тарифе с поддержкой', 'Эмиль', 'проверяет домашние задания', support, 'настройка', 'проверить решение', 'Пишите в чат', 'любые вопросы по учёбе']) {
      expect(text).toContain(fact);
    }
  });

  it('renders the support period from course data', async () => {
    const original = tariffData.getTariffsForCourse;
    const changedSupport = '5 недель личной поддержки Эмиля в Telegram';
    vi.spyOn(tariffData, 'getTariffsForCourse').mockImplementation((slug, options) =>
      original(slug, options).map((tariff) => ({
        ...tariff,
        features: tariff.features.map((feature) => feature.includes('Telegram') ? changedSupport : feature),
      })),
    );
    expect(homeworkAnswer(await courseMarkup())).toContain(changedSupport);
  });

  it('agents: retains the support period when the tariff does not mention Telegram', async () => {
    const support = tariffData.getTariffsForCourse('claude-code-agents')
      .find((tariff) => tariff.hasSupport)!.features.find((feature) => feature.startsWith('Личная поддержка'))!;
    expect(support).toBeTruthy();
    expect(support).not.toContain('Telegram');
    const text = homeworkAnswer(await courseMarkup('claude-code-agents'));
    expect(text).toContain(support);
    assertBudget(text);
  });

  it.each(Object.entries(old.blocks))('rejects the old %s text with the same budget', (_, block) => {
    expect(old.sourceCommit).toBe('2557bec0c889f691dc9135b9cb83530450b3793c');
    expect(createHash('sha256').update(block.text, 'utf8').digest('hex')).toBe(block.sha256);
    expect(words(block.text)).toBeGreaterThan(MAX_WORDS);
    expect(() => assertBudget(block.text)).toThrow();
  });
});

// Optional local browser evidence: real server markup with the mocks above.
afterAll(async () => {
  if (process.env.TEXT_BLOCKS_528_CAPTURE !== '1') return;
  const free = await freeMarkup();
  const homework = await courseMarkup();
  writeFileSync('eval/run-528/free-markup.html', free);
  writeFileSync('eval/run-528/homework-markup.html', homework);
  writeFileSync('eval/run-528/word-counts.json', JSON.stringify({
    limit: MAX_WORDS,
    free: words(freeAnswer(free)),
    homework: words(homeworkAnswer(homework)),
  }, null, 2));
});
