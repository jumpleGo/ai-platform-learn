import React, { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Reel } from '@/lib/reels';
import { ReelUploadForm } from '@/app/admin/reels/reel-upload-form';
import AdminReelsPage from '@/app/admin/reels/page';
import { SiteFooter } from '@/components/site-footer';

const s = vi.hoisted(() => ({ fetch: vi.fn(), confirm: vi.fn(), refresh: vi.fn(), metadata: vi.fn() }));
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({}));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));
vi.mock('@/lib/db/reels', () => ({ listAllReels: async () => [], listReelCourses: async () => [] }));
vi.mock('@/app/admin/reels/actions', () => ({ saveReelAction: s.metadata }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: s.refresh }) }));
// Exercise actual click handlers with persistent state, using the existing test pattern.
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useRef: (initial: unknown) => {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = { current: initial };
    return hooks.slots[i];
  },
  useState: (initial: unknown) => {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = initial;
    return [hooks.slots[i], (value: unknown) => { hooks.slots[i] = value; }];
  },
}));

const reel: Reel = { id: 'reel-1', title: 'Первые шаги', courseSlug: 'course-a', videoPath: 'reels/reel-1/video.mp4', published: false, order: 0 };
const courses = [{ slug: 'course-a', title: 'Курс' }];
function form(value: Reel | undefined = reel, choices = courses) {
  hooks.cursor = 0;
  return ReelUploadForm({ reel: value, courses: choices });
}
function find(node: ReactNode, predicate: (el: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const result = find(child, predicate); if (result) return result;
  }
}
function button(node: ReactNode, label: string) {
  const result = find(node, el => el.type === 'button' && el.props.children === label);
  expect(result, `Missing ${label} button`).toBeDefined();
  expect(result!.props.type).toBe('button');
  return result!;
}
const click = (node: ReactElement<Record<string, unknown>>) => (node.props.onClick as () => Promise<void>)();
beforeEach(() => {
  vi.resetAllMocks(); hooks.slots = []; hooks.cursor = 0;
  s.fetch.mockResolvedValue(Response.json({})); s.confirm.mockReturnValue(true);
  vi.stubGlobal('React', React); vi.stubGlobal('fetch', s.fetch); vi.stubGlobal('window', { confirm: s.confirm });
});
afterEach(() => vi.unstubAllGlobals());

it.each([false, true])('toggles publication from published=%s through the admin endpoint', async (published) => {
  await click(button(form({ ...reel, published }), published ? 'Снять с публикации' : 'Опубликовать'));
  expect(s.fetch).toHaveBeenCalledExactlyOnceWith('/api/admin/reels/reel-1', expect.objectContaining({
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !published }),
  }));
  expect(s.confirm).not.toHaveBeenCalled(); expect(s.refresh).toHaveBeenCalledTimes(1);
  expect(s.metadata).not.toHaveBeenCalled();
});
it('shows a server publication error in Russian and allows retry', async () => {
  s.fetch.mockResolvedValue(Response.json({ error: 'Сначала загрузите видео.' }, { status: 400 }));
  await click(button(form(), 'Опубликовать'));
  const node = form();
  expect(find(node, el => el.props.role === 'alert')?.props.children).toBe('Сначала загрузите видео.');
  expect(button(node, 'Опубликовать').props.disabled).toBe(false);
  expect(s.refresh).not.toHaveBeenCalled();
});
it('cancels deletion without issuing a request', async () => {
  s.confirm.mockReturnValue(false);
  await click(button(form(), 'Удалить'));
  expect(s.confirm).toHaveBeenCalledWith(expect.stringContaining(reel.title));
  expect(s.fetch).not.toHaveBeenCalled(); expect(s.refresh).not.toHaveBeenCalled();
});
it('deletes only after confirmation and refreshes the list', async () => {
  await click(button(form(), 'Удалить'));
  expect(s.confirm).toHaveBeenCalledWith(expect.stringMatching(/видео/));
  expect(s.fetch).toHaveBeenCalledExactlyOnceWith('/api/admin/reels/reel-1', expect.objectContaining({ method: 'DELETE' }));
  expect(s.refresh).toHaveBeenCalledTimes(1);
});
it('keeps delete and unpublish usable when there are no published courses', async () => {
  const node = form({ ...reel, published: true }, []);
  expect(button(node, 'Снять с публикации').props.disabled).toBe(false);
  expect(button(node, 'Удалить').props.disabled).toBe(false);
  await click(button(node, 'Снять с публикации'));
  expect(s.fetch).toHaveBeenCalledTimes(1);
});
it('blocks repeated clicks, deletion and saving while publication is pending', async () => {
  let finish!: (response: Response) => void;
  s.fetch.mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
  const node = form();
  const publish = button(node, 'Опубликовать');
  const pending = click(publish);
  await click(publish); await click(button(node, 'Удалить'));
  expect(s.fetch).toHaveBeenCalledTimes(1); expect(s.confirm).not.toHaveBeenCalled();
  expect(button(form(), 'Удалить').props.disabled).toBe(true);
  expect(find(form(), el => el.props.type === 'submit')?.props.disabled).toBe(true);
  expect(find(form(), el => el.type === 'progress')).toBeUndefined();
  finish(Response.json({ published: true })); await pending;
  expect(button(form(), 'Удалить').props.disabled).toBe(false);
});
it('shares the upload lock so a pending save cannot race with deletion', async () => {
  let finish!: (id: string) => void;
  s.metadata.mockReturnValue(new Promise<string>(resolve => { finish = resolve; }));
  const NativeFormData = globalThis.FormData;
  vi.stubGlobal('FormData', class extends NativeFormData {
    constructor() { super(); this.set('title', reel.title); this.set('courseSlug', reel.courseSlug); this.set('order', '0'); }
  });
  const node = form();
  const pending = (node.props.onSubmit as (e: React.FormEvent<HTMLFormElement>) => Promise<void>)({
    preventDefault: vi.fn(), currentTarget: {},
  } as unknown as React.FormEvent<HTMLFormElement>);
  await click(button(node, 'Удалить'));
  expect(s.confirm).not.toHaveBeenCalled(); expect(s.fetch).not.toHaveBeenCalled();
  finish(reel.id); await pending;
});
it.each(['network', 'html'])('shows a readable error and releases controls on %s failure', async (failure) => {
  if (failure === 'network') s.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  else s.fetch.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));
  await click(button(form(), 'Удалить'));
  expect(find(form(), el => el.props.role === 'alert')?.props.children).toMatch(/[А-Яа-я]/);
  expect(button(form(), 'Удалить').props.disabled).toBe(false);
  expect(s.refresh).not.toHaveBeenCalled();
});
it('offers the public feed from the admin page', async () => {
  expect(renderToStaticMarkup(await AdminReelsPage())).toMatch(/href="\/reels"/);
});
it('lets a visitor discover reels in the site footer', () => {
  expect(renderToStaticMarkup(<SiteFooter />)).toMatch(/href="\/reels"[^>]*>Рилсы<\/a>/);
});
