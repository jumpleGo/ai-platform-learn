import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import FreePage from '@/app/(app)/free/page';
import { EVENTS } from '@/lib/analytics/events';

const { renderedLinks, track } = vi.hoisted(() => ({
  renderedLinks: new Map<string, React.ComponentProps<'a'>>(),
  track: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('@/lib/analytics/track-client', () => ({ track }));
vi.mock('next/link', () => ({
  default: (props: React.ComponentProps<'a'>) => {
    if (props.href) renderedLinks.set(props.href, props);
    return <a {...props} />;
  },
}));

const href = '/courses/claude-code-agents/lessons/1';
const label = 'Бесплатный вводный урок';

beforeEach(() => {
  renderedLinks.clear();
  track.mockClear();
});

async function render(from?: string) {
  return renderToStaticMarkup(await FreePage({ searchParams: Promise.resolve({ from }) }));
}

it.each([undefined, 'vibecoding'])('links directly to lesson 1 below the hero description (from=%s)', async (from) => {
  const html = await render(from);
  const hero = html.match(/<section\b[^>]*>([\s\S]*?)<\/section>/)![1];
  const links = [...hero.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter(([, , content]) => content.replace(/<[^>]*>/g, '').trim() === label);

  expect(links).toHaveLength(1);
  expect(links[0][1]).toContain(`href="${href}"`);
  expect(links[0][1]).not.toMatch(/\bhidden\b|\binvisible\b|display:\s*none/);
  expect(hero).toMatch(new RegExp(`</p>\\s*<a\\b[^>]*href="${href}"`));
  expect(track).not.toHaveBeenCalled();
});

it('tracks the intro lesson target exactly once when the CTA is clicked', async () => {
  await render();
  const onClick = renderedLinks.get(href)?.onClick;
  expect(onClick).toBeTypeOf('function');
  expect(track).not.toHaveBeenCalled();

  onClick!({} as React.MouseEvent<HTMLAnchorElement>);

  expect(EVENTS.freeCtaClicked).toBe('free_cta_click');
  expect(track).toHaveBeenCalledExactlyOnceWith(EVENTS.freeCtaClicked, {
    target: 'lesson1',
  });
});
