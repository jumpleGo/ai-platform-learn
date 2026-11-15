import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getBlogPost } from '@/lib/blog';
import old from './fixtures/vibecoding-intro-553.json';

// Count words, excluding standalone punctuation (the original has 56 words).
const words = (text: string) => text.trim().split(/\s+/u)
  .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

function assertBudget(paragraph: string) {
  expect(words(paragraph)).toBeGreaterThan(0);
  expect(words(paragraph)).toBeLessThanOrEqual(40);
}

describe('task 553: a direct, short vibecoding introduction', () => {
  const post = getBlogPost('vaybkoding-chto-eto')!;
  const intro = post.body.split('\n\n')[0];

  it('keeps the original slug and limits the complete first paragraph to 40 words', () => {
    expect(post.slug).toBe('vaybkoding-chto-eto');
    assertBudget(intro);
  });

  it('answers what vibecoding is in the first sentence', () => {
    const firstSentence = intro.split(/(?<=[.!?])\s/u)[0];
    expect(firstSentence).toMatch(/^Вайбкодинг — (?:это )?создание /u);
    for (const fact of [/сайта/u, /бота/u, /приложения/u, /без ручного кода/u]) {
      expect(firstSentence).toMatch(fact);
    }
  });

  it('preserves the human and AI roles, practical skills and author’s process', () => {
    for (const fact of [
      /Вы словами задаёте «что» и «зачем»/u,
      /ИИ решает «как»/u,
      /пишет, запускает, исправляет код/u,
      /обычный навык/u,
      /ставить задачи/u,
      /проверять результат/u,
      /Покажу свой процесс/u,
    ]) {
      expect(intro).toMatch(fact);
    }
  });

  it('verifies the literal old paragraph and rejects it with the same budget', () => {
    // Frozen text only: no Git commands, remote refs or live baseline reads.
    expect(old.sourceCommit).toBe('891ec7771e1881f3bce9faac620bc791cbf57058');
    expect(createHash('sha256').update(old.paragraph, 'utf8').digest('hex')).toBe(old.sha256);
    expect(words(old.paragraph)).toBe(56);
    expect(() => assertBudget(old.paragraph)).toThrow();
    const oldFails = Number(words(old.paragraph) > 40);
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(1);
  });
});
