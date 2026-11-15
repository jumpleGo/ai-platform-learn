import { describe, expect, it } from 'vitest';
import {
  PROGRAM_URL, buildProgramUrl, getFreeLessonContent, isoDuration,
} from '../src/lib/free-lessons';

describe('free lesson funnel config', () => {
  it('включён только для пяти уроков курса claude-code', () => {
    expect([1, 2, 3, 4, 5].map((n) => getFreeLessonContent('claude-code', n)?.lessonId))
      .toEqual(['01', '02', '03', '04', '05']);
    expect(getFreeLessonContent('claude-code', 6)).toBeNull();
    expect(getFreeLessonContent('ai-cartoons', 1)).toBeNull();
  });

  it('у каждого урока есть уникальный SEO и смысловой контент', () => {
    const lessons = [1, 2, 3, 4, 5].map((n) => getFreeLessonContent('claude-code', n)!);
    expect(new Set(lessons.map((lesson) => lesson.h1))).toHaveLength(5);
    expect(new Set(lessons.map((lesson) => lesson.seoTitle))).toHaveLength(5);
    for (const lesson of lessons) {
      expect(lesson.outcomes).toHaveLength(3);
      expect(lesson.bridgeText.length).toBeGreaterThan(80);
      expect(lesson.faq.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('урок про роли: короткие слова и тире не висят на краю строки', () => {
    const lesson = getFreeLessonContent('claude-code', 5)!;
    const texts = [
      lesson.h1, lesson.lead, ...lesson.outcomes, lesson.bridgeTitle, lesson.bridgeText,
      lesson.ctaLabel, lesson.seoTitle, lesson.seoDescription,
      ...lesson.faq.flatMap((item) => [item.question, item.answer]),
    ];
    for (const text of texts) {
      // после короткого слова — только неразрывный пробел U+00A0
      expect(text).not.toMatch(/(^|[\s(«])(и|а|в|с|к|о|у|на|по|за|из|от|до|не|ни|но|то|как|для|без|под|над|при|про|же|бы|ли) /i);
      // тире не начинает строку
      expect(text).not.toMatch(/ —/);
      // символ, а не HTML-сущность
      expect(text).not.toContain('&nbsp;');
    }
    expect(lesson.faq.map((item) => item.answer).join(' ')).toContain('/office-hours');
  });
});

describe('buildProgramUrl', () => {
  it('ведёт на программу и всегда маркирует урок как источник', () => {
    const lesson = getFreeLessonContent('claude-code', 2)!;
    const url = new URL(buildProgramUrl(lesson), 'https://gelato.education');
    expect(url.pathname).toBe(PROGRAM_URL);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      source: 'free_lesson',
      medium: 'lesson',
      campaign: 'gelato_dev',
      content: 'lesson_02',
      lesson_id: '02',
      utm_source: 'free_lesson',
      utm_medium: 'lesson',
      utm_campaign: 'gelato_dev',
      utm_content: 'lesson_02',
    });
  });

  it('сохраняет входящие UTM, но не позволяет затереть системный source и lesson_id', () => {
    const lesson = getFreeLessonContent('claude-code', 3)!;
    const url = new URL(buildProgramUrl(lesson, {
      source: 'wrong',
      lesson_id: '99',
      utm_source: 'telegram',
      utm_campaign: ['launch', 'ignored'],
    }), 'https://gelato.education');
    expect(url.searchParams.get('source')).toBe('free_lesson');
    expect(url.searchParams.get('lesson_id')).toBe('03');
    expect(url.searchParams.get('utm_source')).toBe('telegram');
    expect(url.searchParams.get('utm_campaign')).toBe('launch');
  });
});

describe('isoDuration', () => {
  it('формирует ISO 8601 длительность для schema.org', () => {
    expect(isoDuration(50)).toBe('PT50S');
    expect(isoDuration(181)).toBe('PT3M1S');
    expect(isoDuration(3600)).toBe('PT1H');
    expect(isoDuration(null)).toBeUndefined();
  });
});
