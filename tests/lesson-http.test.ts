import { describe, expect, it } from 'vitest';

// Production integration: LESSON_HTTP_ORIGIN=http://127.0.0.1:3180 npx vitest run.
// Use the isolated catalog fixture described in the #180 measurement, with
// resolveLesson delayed by 1600 ms. No database credentials are needed.
const origin = process.env.LESSON_HTTP_ORIGIN;
const missing = [
  '/courses/claude-code/lessons/1', // unpublished number in the fixture
  '/courses/no-such-course/lessons/1',
  '/courses/claude-code/lessons/0',
  '/courses/claude-code/lessons/not-a-number',
  '/courses/claude-code/lessons/999',
];
const existing = [
  '/courses/claude-code-agents/lessons/1?from=course_landing',
  ...[2, 3, 4].map((n) => `/courses/claude-code/lessons/${n}`),
];

describe.skipIf(!origin)('production lesson HTTP status before streaming', () => {
  it.each(missing)('%s returns 404 before the response starts', async (path) => {
    const started = performance.now();
    const response = await fetch(new URL(path, origin), { redirect: 'manual' });
    const headersAfter = performance.now() - started;
    await response.text();
    expect(response.status).toBe(404);
    expect(headersAfter).toBeGreaterThanOrEqual(1500);
  });

  it.each(existing)('%s remains a real 200', async (path) => {
    const response = await fetch(new URL(path, origin), { redirect: 'manual' });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).not.toContain('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(body).not.toContain('NEXT_HTTP_ERROR_FALLBACK;500');
  });
});
