import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { createElement, lazy, Suspense, type ReactNode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

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

  it('не отправляет shell, пока проверка урока ожидает данные', async () => {
    let finishLookup!: (value: null) => void;
    resolveLesson.mockReturnValue(new Promise((done) => { finishLookup = done; }));
    // React.lazy адаптирует async RSC layout к обычному серверному renderer.
    const Gate = lazy(async () => {
      const content = await render('no-such-course', '1');
      return { default: () => content };
    });
    let tree: ReactNode = createElement(Gate);
    const app = resolve('src/app');
    let segment = resolve('src/app/(app)/courses/[courseSlug]/lessons');
    // loading того же сегмента находится ПОД layout; только предки могут
    // отправить fallback раньше проверки. Читаем реальные границы маршрута.
    for (;;) {
      if (existsSync(join(segment, 'loading.tsx'))) {
        tree = createElement(Suspense, { fallback: 'loading' }, tree);
      }
      if (segment === app) break;
      segment = dirname(segment);
    }
    const events: string[] = [];
    await new Promise<void>((done) => {
      const stream = renderToPipeableStream(tree, {
        onShellReady() {
          events.push('shell');
          stream.pipe(new PassThrough()).resume();
        },
        onShellError() { done(); },
        onAllReady() { done(); },
        onError() {}, // Ожидаемый notFound; проверяем именно порядок стриминга.
      });
      setTimeout(() => { events.push('lookup'); finishLookup(null); }, 50);
    });
    expect(events).toEqual(['lookup']);
  });
});
