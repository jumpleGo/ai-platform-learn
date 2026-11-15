import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import FreePage from '@/app/(app)/free/page';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';
import type { CourseWithLessons } from '@/lib/db/courses';
import old from './fixtures/text-blocks-2557bec.json';

// Real server markup, with no database, session or analytics requests.
vi.mock('@/lib/db/courses', () => ({
  getPublishedCoursesWithLessons: async () => [{
    id: 'vibe-document', slug: 'vibecoding', title: 'Курс', description: '',
    published: true, isTest: false, coverUrl: null, order: 1, access: 'paid',
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

function assertBudget(text: string) {
  expect(words(text)).toBeGreaterThan(0);
  expect(words(text)).toBeLessThanOrEqual(MAX_WORDS);
}

async function freeMarkup() {
  return renderToStaticMarkup(await FreePage({}));
}

async function courseMarkup() {
  return renderToStaticMarkup(await CourseLandingPage({
    params: Promise.resolve({ courseSlug: 'vibecoding' }),
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

  it.each(Object.entries(old.blocks))('rejects the old %s text with the same budget', (_, block) => {
    expect(old.sourceCommit).toBe('2557bec0c889f691dc9135b9cb83530450b3793c');
    expect(createHash('sha256').update(block.text, 'utf8').digest('hex')).toBe(block.sha256);
    expect(() => assertBudget(block.text)).toThrow();
  });
});
