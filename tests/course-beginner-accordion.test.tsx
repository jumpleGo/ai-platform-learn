import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';

// Literal catalog fixture: no database, credentials or moving git references.
vi.stubGlobal('React', React);
vi.mock('@/lib/db/courses', () => ({
  getPublishedCoursesWithLessons: async () => [{
    id: 'course', slug: 'claude-code-agents', title: 'Курс для новичков',
    description: '', published: true, isTest: false, coverUrl: null, order: 1, access: 'paid',
    lessons: [{ id: 'intro', number: 1, title: 'Вступление', access: 'free', published: true }],
  }],
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

const answerStarts = [
  'Начните с одной небольшой задачи:',
  'Учиться пользоваться ChatGPT можно на своих повседневных задачах',
  'Нейросеть учится на множестве примеров:',
  'Начните с одной понятной задачи:',
  'Начните с понятного описания задачи:',
  'На курсе Gelato для новичков работу с ИИ объясняют через практику:',
  'Да, перед покупкой можно посмотреть бесплатный вводный урок',
];

describe('Course beginner answers are available on demand', () => {
  it.each(['control', 'core'])('keeps the hero short and all answers in closed details (%s)', async (variant) => {
    const html = renderToStaticMarkup(await CourseLandingPage({
      params: Promise.resolve({ courseSlug: 'claude-code-agents' }),
      searchParams: Promise.resolve({ exp_agents_landing_blocks: variant }),
    }));
    const hero = html.match(/<section\b[^>]*>([\s\S]*?)<\/section>/)![1];
    const section = html.match(/<section\b[^>]*id="beginner-answers"[^>]*>([\s\S]*?)<\/section>/)![1];
    for (const answer of answerStarts) expect(hero).not.toContain(answer);

    const details = [...section.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
    expect(details).toHaveLength(6);
    const questions = details.map(([, attributes, content]) => {
      expect(attributes).not.toMatch(/(?:^|\s)open(?:\s|=|$)/);
      const summary = content.match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary>/);
      expect(summary).not.toBeNull();
      expect(content).toContain('<p');
      for (const answer of answerStarts) expect(summary![1]).not.toContain(answer);
      return summary![1].replace(/<[^>]*>/g, '').trim();
    });
    expect(new Set(questions).size).toBe(6);
    expect(questions.filter((question) => question === 'Я новичок: с чего начать ИИ с нуля?')).toHaveLength(1);
    const expanded = details.map((match) => match[2]).join('');
    for (const answer of answerStarts) expect(expanded.split(answer)).toHaveLength(2);
    expect(section.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '')).not.toMatch(/<p\b/);
  });
});
