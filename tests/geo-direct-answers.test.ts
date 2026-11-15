import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getBlogPost } from '@/lib/blog';
import { FAQ_GROUPS } from '@/lib/faq-content';
import { FREE_PAGE_ANSWER } from '@/lib/geo-answers';

// Критерий: абзац 40–70 слов, а первая фраза сама содержит ключевые термины вопроса.
const norm = (s: string) => s.replace(/ /g, ' ').trim();
const words = (s: string) => norm(s).split(/\s+/).filter(Boolean).length;
const firstSentence = (s: string) => norm(s).split(/(?<=[.!?])\s/)[0];

function check(paragraph: string, terms: RegExp[]) {
  const n = words(paragraph);
  const first = firstSentence(paragraph);
  return n >= 40 && n <= 70 && terms.every((t) => t.test(first));
}

const Q11 = [/учёб/i, /ChatGPT|Claude|Gemini|GigaChat|YandexGPT/];
const Q3_Q8 = [/бесплатн/i, /нейросет/i, /с нуля/i, /русск/i];
const Q8 = [/с нуля/i, /русск/i];

// Литеральные старые первые строки из origin/main (git show origin/main:<file>)
const OLD = {
  blog: 'Универсальной «лучшей нейросети» нет — как нет лучшего вкуса мороженого. Есть лучшая под вашу задачу. Если коротко: ChatGPT — самый универсальный, Claude — сильнее всего в коде и длинных текстах, Gemini — для огромных документов и экосистемы Google, DeepSeek — сильный бесплатный вариант, а GigaChat и YandexGPT работают в России без обходных путей. Дальше разберу подробнее и дам таблицу по задачам.',
  free: 'Про принципы работы с ИИ: как объяснить задачу, зачем нужен контекст и почему модель ошибается. Без привязки к инструменту — работает и в Claude, и в ChatGPT, и в Gemini.',
  faq: 'Да. Большая часть учеников — маркетологи, дизайнеры, предприниматели, родители, врачи.',
};

describe('GEO: прямой ответ в начале страницы', () => {
  const blogBody = getBlogPost('kakuyu-neyroset-vybrat')!.body;
  const blogFirst = blogBody.split('\n\n')[0];
  const faqFirst = FAQ_GROUPS[0].items[0];
  const freeSrc = readFileSync('src/app/(app)/free/page.tsx', 'utf8');

  it('блог: первый абзац отвечает на q11', () => {
    expect(check(blogFirst, Q11)).toBe(true);
    expect(blogBody).toContain(OLD.blog); // старый текст не удалён
  });

  it('/free: короткий ответ на q3+q8 стоит сразу после h1 и до кнопки урока', () => {
    // #528 заменяет прежний минимум 40 слов коротким вводным ответом.
    // Полный бюджет ответа вместе с пунктами проверяет text-blocks-528.test.tsx.
    expect(words(FREE_PAGE_ANSWER)).toBeGreaterThan(0);
    expect(words(FREE_PAGE_ANSWER)).toBeLessThanOrEqual(40);
    expect(Q3_Q8.every((term) => term.test(firstSentence(FREE_PAGE_ANSWER)))).toBe(true);
    const h1 = freeSrc.indexOf('</h1>');
    const mine = freeSrc.indexOf('{FREE_PAGE_ANSWER}');
    const cta = freeSrc.indexOf('<FreeIntroLessonButton');
    expect(h1).toBeGreaterThan(-1);
    expect(mine).toBeGreaterThan(h1);
    expect(cta).toBeGreaterThan(mine);
  });

  it('/faq: первый вопрос группы — q8, ответ начинается с прямого ответа', () => {
    expect(norm(faqFirst.question)).toContain('Где учить ИИ с нуля');
    expect(check(faqFirst.answer, Q8)).toBe(true);
  });

  it('негатив: на старых первых строках из origin/main проверка падает', () => {
    const oldFails = [
      check(OLD.blog, Q11),
      check(OLD.free, Q3_Q8),
      check(OLD.faq, Q8),
    ].filter((ok) => !ok).length;
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(3);
  });
});
