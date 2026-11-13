import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getBlogPost } from '@/lib/blog';
import { AGENTS_INTRO_LESSON, getFreeLessonContent } from '@/lib/free-lessons';
import { lessonPath } from '@/lib/slug';

// Каталог опубликованных уроков, зафиксированный в коде: бесплатные уроки воронки
// claude-code (free-lessons.ts) и вводный урок claude-code-agents. Живой каталог лежит
// в Firestore (getPublishedCoursesWithLessons) и из тестов недоступен.
const CATALOG = new Set<string>([
  ...[1, 2, 3, 4, 5]
    .filter((n) => getFreeLessonContent('claude-code', n))
    .map((n) => lessonPath('claude-code', n)),
  lessonPath(AGENTS_INTRO_LESSON.courseSlug, AGENTS_INTRO_LESSON.number),
]);
const SLUGS = ['chto-takoe-llm', 'chto-takoe-rag', 'chto-takoe-mcp'];

// ссылка на урок должна стоять сразу после первого абзаца и повторяться в конце
function lessonLinksOk(body: string): boolean {
  const blocks = body.split('\n\n');
  const href = (b: string | undefined) => b?.match(/\]\((\/courses\/[^)\s]+\/lessons\/\d+)\)/)?.[1];
  const top = href(blocks[1]);
  const end = href(blocks[blocks.length - 1]);
  return !!top && top === end && CATALOG.has(top);
}

describe('ссылки на уроки в объяснялках LLM/RAG/MCP', () => {
  for (const slug of SLUGS) {
    it(`${slug}: сразу после первого абзаца и в конце — опубликованный урок`, () => {
      const body = getBlogPost(slug)!.body;
      expect(body.split('\n\n')[1]).toMatch(/^Попробовать на практике — урок /);
      expect(lessonLinksOk(body)).toBe(true);
    });
  }

  it('на старом blog.ts из origin/main проверка красная для всех трёх', () => {
    const old = execSync('git show origin/main:src/lib/blog.ts', { maxBuffer: 1 << 26 }).toString();
    const cache = join(homedir(), '.cache', 'vera313');
    execSync(`mkdir -p ${cache}`);
    const copy = join(cache, 'blog.old.ts');
    execSync(`git show origin/main:src/lib/blog.ts > ${copy}`);
    const oldBody = (slug: string) => {
      const name = `${slug.replace('chto-takoe-', '').toUpperCase()}_EXPLAINER_BODY`;
      return readFileSync(copy, 'utf8').match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`))![1];
    };
    expect(old.length).toBeGreaterThan(0);
    const oldFails = SLUGS.filter((s) => !lessonLinksOk(oldBody(s))).length;
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(3);
  });
});
