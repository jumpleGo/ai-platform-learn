import { describe, expect, it } from 'vitest';
import { QUIZ, pickQuizResult } from '../src/lib/quiz';
import { getCourseLanding } from '../src/lib/course-landings';

describe('тест-подбор обучения', () => {
  it('у каждого вопроса есть варианты, и все они начисляют баллы', () => {
    expect(QUIZ.length).toBeGreaterThan(2);
    for (const question of QUIZ) {
      expect(question.options.length).toBeGreaterThan(1);
      for (const option of question.options) {
        expect(Object.keys(option.scores).length).toBeGreaterThan(0);
      }
    }
  });

  it('каждый возможный результат ведёт на существующий лендинг', () => {
    const slugs = new Set(QUIZ.flatMap((q) => q.options.flatMap((o) => Object.keys(o.scores))));
    for (const slug of slugs) {
      expect(getCourseLanding(slug), slug).not.toBeNull();
    }
  });

  it('выбирает курс с наибольшей суммой баллов', () => {
    // «живой проект» + «продукт, который не падает» + «пишу код» + «ИИ ломает работавшее»
    expect(pickQuizResult([0, 0, 0, 0]).slug).toBe('vibecoding');
    // «ни кода, ни проекта» + «видео и мультики» + «код впервые» + «генерации в мусор»
    expect(pickQuizResult([3, 1, 2, 2]).slug).toBe('ai-cartoons');
    // «идея, до кода не дошло» + «агенты» + «что-то читаю» + «не понимаю, с чего начать»
    expect(pickQuizResult([1, 2, 1, 3]).slug).toBe('claude-code-agents');
  });

  it('неполные и мусорные ответы не роняют подбор', () => {
    expect(pickQuizResult([]).slug).toBe('claude-code-agents');
    expect(pickQuizResult([99, 99]).slug).toBe('claude-code-agents');
  });
});
