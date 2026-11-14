import { createHash } from 'node:crypto';
import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/(app)/(home)/page';
import { pickQuizResult } from '@/lib/quiz';
import type { CourseWithLessons } from '@/lib/db/courses';

// Public catalog snapshot: /sitemap.xml and course hrefs on 2026-11-14 (#335).
// Hub lesson 1 is unpublished; numbers must not shift when it is filtered out.
const { catalog } = vi.hoisted(() => ({
  catalog: Object.entries({
    'claude-code-agents': [1], 'vibecoding': [1, 3, 4, 5, 6, 7],
    'ai-cartoons': [1], 'claude-code': [2, 3, 4],
  }).map(([slug, numbers]) => ({
    id: slug, slug, title: slug, description: '', published: true, isTest: false,
    lessons: numbers.map((number) => ({
      id: String(number), number, title: String(number), description: '', published: true,
      access: slug === 'claude-code' || number === 1 ? 'free' : 'paid',
    })),
  })) as CourseWithLessons[],
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => catalog }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));

// Frozen literal hrefs: two classic-home role links and the expanded quiz href.
// Source commit: 96be86ffe2c8a0ca971f1e1256f158bb80300bb4.
// SHA256 of JSON.stringify(OLD_HREFS):
// c88257fdc3e9e8a839fc8a1501edf2ad97bda42c14f801bd9eb7414cc043b4d0
const OLD_HREFS = [
  '/courses/it-vibecoding',
  '/courses/it-vibecoding',
  '/courses/it-vibecoding',
] as const;

function exists(href: string): boolean {
  const match = new URL(href, 'https://gelato.education').pathname
    .match(/^\/courses\/([^/]+)(?:\/lessons\/([1-9]\d*))?$/);
  const course = catalog.find((item) => item.slug === match?.[1] && item.published);
  return !!course && (!match?.[2] || course.lessons.some((lesson) =>
    lesson.number === Number(match[2]) && lesson.published !== false));
}

function hrefs(node: ReactNode): string[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ href?: string; children?: ReactNode }>(child)) return [];
    const { href, children } = child.props;
    return [...(href?.startsWith('/courses/') ? [href] : []), ...hrefs(children)];
  });
}

describe('published course and lesson link targets', () => {
  it('rejects the frozen old hrefs with the same catalog validator', () => {
    expect(createHash('sha256').update(JSON.stringify(OLD_HREFS)).digest('hex'))
      .toBe('c88257fdc3e9e8a839fc8a1501edf2ad97bda42c14f801bd9eb7414cc043b4d0');
    const failures = OLD_HREFS.filter((href) => !exists(href));
    console.log(`OLD_FAILS=${failures.length}`);
    expect(failures).toHaveLength(3);
    expect(exists('/courses/claude-code/lessons/1')).toBe(false);
  });

  it('every home course and lesson link resolves in the published catalog', async () => {
    const links = hrefs(await HomePage());
    expect(links.filter((href) => href.includes('/lessons/'))).toHaveLength(3);
    expect(links.length).toBeGreaterThan(3);
    expect(links.filter((href) => !exists(href))).toEqual([]);
  });

  it.each([[0, 0, 0, 0], [3, 1, 2, 2], [1, 2, 1, 3]])(
    'quiz result %j links to a published course', (...answers) => {
      const result = pickQuizResult(answers) as ReturnType<typeof pickQuizResult> & { href: string };
      expect(result.href).toBeTypeOf('string');
      expect(exists(result.href)).toBe(true);
    },
  );
});
