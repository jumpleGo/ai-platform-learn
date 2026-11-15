import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getBlogPost } from './blog';

// Old VIBECODING_BODY excerpt: src/lib/blog.ts:586 at commit
// 40e5a21cc8a16ab7b95c8a38cf1fa609165f9e2f.
// Source file sha256: 4fbae77989c9d8fd8444d9976c7f9069d318ce583b328c8d8039f5d4ea285c3a.
// Literal sha256 (UTF-8, no newline): e52a8037a07b2f7f9b3e7ff6d24e8ff185874ad70edacd03dc3f59090eda617c.
const OLD_BODY = '## С чего начать';

function expectTryIt(body: string) {
  const section = body.match(/(?:^|\n)## Попробуйте сами\n([\s\S]*?)(?=\n## |$)/u)?.[1];
  expect(section, 'Попробуйте сами must be present in the article body').toBeDefined();
  expect(section).toMatch(/^>.*Сделай.*список покупок.*«хлеб».*«молоко»/mu);
  expect(section).toContain('```text\nхлеб\nмолоко\n```');
  expect(section).toMatch(/\*\*Как проверить:\*\*.*запустите.*сравните.*образцом/u);
  expect(section).toContain('](/blog/examples/claude-md-shopping-list.zip)');
  expect(section).not.toMatch(/\d/u);
}

describe('vibecoding try-it block, task 484', () => {
  it('gives a ready AI task, expected output and a way to check the program', () => {
    const post = getBlogPost('vaybkoding-chto-eto');
    expect(post).not.toBeNull();
    const body = process.env.VIBECODING_TRYIT_484_OLD_FIXTURE === '1'
      ? OLD_BODY
      : post!.body;
    expectTryIt(body);
  });

  it('keeps the minimal old literal frozen', () => {
    expect(createHash('sha256').update(OLD_BODY).digest('hex'))
      .toBe('e52a8037a07b2f7f9b3e7ff6d24e8ff185874ad70edacd03dc3f59090eda617c');
  });

  it('counts the same check failing on the old literal in every run', () => {
    let oldFails = 0;
    expect(() => {
      try {
        expectTryIt(OLD_BODY);
      } catch (error) {
        oldFails += 1;
        throw error;
      }
    }).toThrowError(/Попробуйте сами/);
    expect(oldFails).toBe(1);
    console.info(`OLD_FAILS=${oldFails}`);
  });
});
