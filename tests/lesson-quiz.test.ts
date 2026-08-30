import { describe, expect, it } from 'vitest';
import {
  getLessonQuizResult,
  LESSON_QUIZ_QUESTIONS,
  LESSON_QUIZ_RESULTS,
  LESSON_QUIZ_TTL_MS,
  pickLessonQuizResult,
} from '../src/lib/lesson-quiz';
import { getFreeLessonContent } from '../src/lib/free-lessons';

describe('подбор открытого урока по боли', () => {
  it('задаёт три ситуационных вопроса с тремя вариантами', () => {
    expect(LESSON_QUIZ_QUESTIONS).toHaveLength(3);
    for (const question of LESSON_QUIZ_QUESTIONS) {
      expect(question.options).toHaveLength(3);
      for (const option of question.options) expect(Object.keys(option.scores).length).toBeGreaterThan(0);
    }
  });

  it('подбирает три разные боли и три разные урока', () => {
    expect(LESSON_QUIZ_RESULTS).toHaveLength(3);
    expect(new Set(LESSON_QUIZ_RESULTS.map((result) => result.id))).toHaveLength(3);
    expect(new Set(LESSON_QUIZ_RESULTS.map((result) => result.lessonNumber))).toHaveLength(3);
  });

  it('собирает диагноз по всем трём ответам', () => {
    expect(pickLessonQuizResult([0, 0, 0]).id).toBe('prompting');
    expect(pickLessonQuizResult([1, 1, 1]).id).toBe('tokens');
    expect(pickLessonQuizResult([2, 2, 2]).id).toBe('hallucinations');
    expect(pickLessonQuizResult([99, 99, 99]).id).toBe('prompting');
  });

  it('каждый результат ведёт на существующий открытый урок с аналитическими метками', () => {
    for (const result of LESSON_QUIZ_RESULTS) {
      expect(getFreeLessonContent('claude-code', result.lessonNumber)).not.toBeNull();
      const url = new URL(result.href, 'https://gelato.education');
      expect(url.pathname).toBe(`/courses/claude-code/lessons/${result.lessonNumber}`);
      expect(url.searchParams.get('source')).toBe('pain_quiz');
      expect(url.searchParams.get('utm_source')).toBe('gelateria');
    }
  });

  it('хранит персональную подборку 12 часов и безопасно обрабатывает неизвестный id', () => {
    expect(LESSON_QUIZ_TTL_MS).toBe(12 * 60 * 60 * 1000);
    expect(getLessonQuizResult('tokens')?.lessonNumber).toBe(3);
    expect(getLessonQuizResult('unknown')).toBeNull();
  });
});
