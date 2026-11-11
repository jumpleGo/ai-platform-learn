import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveLesson = vi.fn();
vi.mock('@/lib/db/courses', () => ({ resolveLesson: (...a: unknown[]) => resolveLesson(...a) }));

import LessonSegmentLayout from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout';

const render = (courseSlug: string, lessonNumber: string) =>
  LessonSegmentLayout({ children: 'ok', params: Promise.resolve({ courseSlug, lessonNumber }) });

describe('layout урока: 404 до loading.tsx', () => {
  beforeEach(() => resolveLesson.mockReset());

  it.each([
    ['claude-code', '999'],
    ['claude-code', 'abc'],
    ['no-such-course', '1'],
  ])('несуществующий урок %s/%s бросает notFound', async (c, n) => {
    resolveLesson.mockResolvedValue(null);
    await expect(render(c, n)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404') });
  });

  it('существующий урок рендерится', async () => {
    resolveLesson.mockResolvedValue({ number: 1 });
    await expect(render('claude-code-agents', '1')).resolves.toBe('ok');
  });
});
