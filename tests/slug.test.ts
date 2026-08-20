import { describe, expect, it } from 'vitest';
import { courseKey, isValidSlug, lessonPath, parseLessonNumber, slugify, waitlistPath } from '@/lib/slug';

describe('slugify', () => {
  it('транслитерирует русские названия', () => {
    expect(slugify('Основы платформы')).toBe('osnovy-platformy');
    expect(slugify('ИИ мультики')).toBe('ii-multiki');
    expect(slugify('Вайбкодим с инженерским подходом')).toBe('vaybkodim-s-inzhenerskim-podhodom');
  });

  it('чистит регистр, пунктуацию и края', () => {
    expect(slugify('Claude Code — свои агенты!')).toBe('claude-code-svoi-agenty');
    expect(slugify('  ***  ')).toBe('');
    expect(slugify('Курс №1: старт')).toBe('kurs-1-start');
  });

  it('обрезает длинные названия по границе слова', () => {
    const slug = slugify('Очень длинное название курса про искусственный интеллект и всё остальное');
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.startsWith('ochen-dlinnoe-nazvanie')).toBe(true);
  });
});

describe('isValidSlug', () => {
  it('пропускает только латиницу, цифры и дефис', () => {
    expect(isValidSlug('claude-code')).toBe(true);
    expect(isValidSlug('kurs2')).toBe(true);
    expect(isValidSlug('-kurs')).toBe(false);
    expect(isValidSlug('Kurs')).toBe(false);
    expect(isValidSlug('курс')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });
});

describe('courseKey', () => {
  it('берёт slug, а без него — id документа', () => {
    expect(courseKey({ id: 'abc123', slug: 'claude-code' })).toBe('claude-code');
    expect(courseKey({ id: 'abc123', slug: '' })).toBe('abc123');
    expect(courseKey({ id: 'abc123' })).toBe('abc123');
  });
});

describe('пути', () => {
  it('собирает адреса урока и лендинга', () => {
    expect(lessonPath('claude-code', 3)).toBe('/courses/claude-code/lessons/3');
    expect(waitlistPath('ai-cartoons')).toBe('/waitlist/ai-cartoons');
  });
});

describe('parseLessonNumber', () => {
  it('принимает только номер урока', () => {
    expect(parseLessonNumber('1')).toBe(1);
    expect(parseLessonNumber('42')).toBe(42);
    expect(parseLessonNumber('01')).toBeNull();
    expect(parseLessonNumber('0')).toBeNull();
    expect(parseLessonNumber('XnbbS0jZ6KaVcmKVCymX')).toBeNull();
    expect(parseLessonNumber('')).toBeNull();
  });
});
