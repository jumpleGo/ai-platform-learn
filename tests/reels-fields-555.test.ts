import React, { Children, isValidElement, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldValue } from 'firebase-admin/firestore';
import * as reelModel from '@/lib/reels';
import type { Reel } from '@/lib/reels';
import { createReel, getReel, listAllReels, listPublishedReels, updateReelMetadata } from '@/lib/db/reels';
import { saveReelAction } from '@/app/admin/reels/actions';
import { ReelUploadForm } from '@/app/admin/reels/reel-upload-form';

const s = vi.hoisted(() => ({
  collection: vi.fn(), add: vi.fn(), update: vi.fn(), ref: vi.fn(), get: vi.fn(),
  list: vi.fn(), courses: vi.fn(), guard: vi.fn(), revalidate: vi.fn(), refresh: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: s.collection } }));
vi.mock('@/lib/require-admin', () => ({ requireAdmin: s.guard }));
vi.mock('next/cache', () => ({ revalidatePath: s.revalidate }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: s.refresh }) }));
// Exercise the form's actual submit handler without a DOM or an upload.
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useRef: (initial: unknown) => ({ current: initial }),
  useState: (initial: unknown) => [initial, vi.fn()],
}));

const course = { slug: 'course-a', title: 'Название курса', description: 'Описание курса' };
const base = { courseSlug: course.slug, order: 2 };
const legacy: Reel = {
  id: 'reel-1', ...base, published: true,
  videoPath: 'reels/reel-1/123e4567-e89b-42d3-a456-426614174000.mp4',
};
const overrides = {
  title: 'Заголовок ролика', description: 'Короткое описание ролика',
  ctaLabel: 'Открыть урок 1', ctaHref: '/courses/course-a/lessons/1',
};
const doc = (data: object) => ({ id: legacy.id, exists: true, data: () => data });
const NativeFormData = globalThis.FormData;
function formData(values: Record<string, string> = {}) {
  const data = new NativeFormData();
  for (const [key, value] of Object.entries({ courseSlug: course.slug, order: '2', ...values })) data.set(key, value);
  return data;
}
function field(node: ReactNode, name: string): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (node.props.name === name) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const match = field(child, name);
    if (match) return match;
  }
}
function noWrites() {
  expect(s.add).not.toHaveBeenCalled();
  expect(s.update).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('React', React);
  s.collection.mockImplementation((name: string) => {
    if (name === 'courses') return { where: () => ({ get: s.courses }) };
    if (name === 'reels') return { add: s.add, doc: s.ref, get: s.list, where: () => ({ get: s.list }) };
    throw new Error(`Unexpected collection: ${name}`);
  });
  s.courses.mockResolvedValue({ docs: [doc({ ...course, published: true })] });
  s.ref.mockReturnValue({ get: s.get, update: s.update });
  s.get.mockResolvedValue(doc(legacy));
  s.list.mockResolvedValue({ docs: [doc(legacy)] });
  s.add.mockResolvedValue({ id: legacy.id });
});
afterEach(() => vi.unstubAllGlobals());

describe('reel text and CTA contract', () => {
  it('keeps legacy documents optional and supplies course text and the existing course CTA publicly', async () => {
    expect(await getReel(legacy.id)).toEqual(legacy);
    expect(await listAllReels()).toEqual([legacy]);
    expect(await listPublishedReels()).toEqual([{
      ...legacy, title: course.title, description: course.description,
      ctaLabel: 'Перейти в курс', ctaHref: '/courses/course-a',
    }]);
  });

  it('preserves an existing reel title and normalizes without changing the stored input', () => {
    const stored = Object.freeze({ ...legacy, title: 'Прежний заголовок' });
    expect(reelModel.normalizeReel(stored, course)).toEqual({
      ...stored, description: course.description, ctaLabel: 'Перейти в курс', ctaHref: '/courses/course-a',
    });
    expect(stored).not.toHaveProperty('description');
  });

  it('creates a draft without any text overrides or undefined Firestore fields', async () => {
    expect(await createReel(base)).toBe(legacy.id);
    expect(s.add).toHaveBeenCalledExactlyOnceWith({ ...base, videoPath: '', published: false });
  });

  it('trims and preserves all overrides through creation and every read projection', async () => {
    await createReel({ ...base, ...Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, ` ${value} `])) });
    expect(s.add).toHaveBeenCalledExactlyOnceWith({ ...base, ...overrides, videoPath: '', published: false });
    const stored = { ...legacy, ...overrides, posterPath: 'reels/reel-1/poster.webp' };
    s.get.mockResolvedValue(doc({ ...stored, id: 'spoofed', privateNote: 'private' }));
    s.list.mockResolvedValue({ docs: [doc({ ...stored, id: 'spoofed', privateNote: 'private' })] });
    expect(await getReel(legacy.id)).toEqual(stored);
    expect(await listAllReels()).toEqual([stored]);
    expect(await listPublishedReels()).toEqual([stored]);
  });

  it('updates overrides without changing the video or publication', async () => {
    await updateReelMetadata(legacy.id, { ...base, ...overrides });
    expect(s.ref).toHaveBeenCalledWith(legacy.id);
    expect(s.update).toHaveBeenCalledExactlyOnceWith({ ...base, ...overrides });
  });

  it('restores course defaults when the admin clears the optional fields', async () => {
    await saveReelAction(legacy.id, formData({ title: '', description: ' ', ctaLabel: '', ctaHref: '' }));
    expect(s.update).toHaveBeenCalledExactlyOnceWith({
      ...base, title: FieldValue.delete(), description: FieldValue.delete(),
      ctaLabel: FieldValue.delete(), ctaHref: FieldValue.delete(),
    });
    expect(s.add).not.toHaveBeenCalled();
  });

  it('accepts a description of exactly 300 characters', async () => {
    const description = 'я'.repeat(300);
    await createReel({ ...base, title: overrides.title, description });
    expect(s.add).toHaveBeenCalledWith(expect.objectContaining({ description }));
  });

  it('rejects descriptions over 300 characters on both create and update', async () => {
    const metadata = { ...base, title: overrides.title, description: 'я'.repeat(301) };
    await expect(createReel(metadata)).rejects.toThrow();
    await expect(updateReelMetadata(legacy.id, metadata)).rejects.toThrow();
    noWrites();
  });

  it('still requires a published course before writing overrides', async () => {
    s.courses.mockResolvedValue({ docs: [doc({ ...course, published: false })] });
    await expect(createReel({ ...base, ...overrides })).rejects.toThrow('Course is not published');
    await expect(updateReelMetadata(legacy.id, { ...base, ...overrides })).rejects.toThrow('Course is not published');
    noWrites();
  });

  it.each(['/courses/course-a', '/courses/course-a/lessons/1?from=reels#start', '/', 'https://example.com/lesson'])('persists an allowed CTA: %s', async (ctaHref) => {
    await createReel({ ...base, title: overrides.title, ctaHref });
    expect(s.add).toHaveBeenCalledWith(expect.objectContaining({ ctaHref }));
  });

  it.each([
    'javascript:', 'javascript:alert(1)', '//evil', 'http://evil.test', 'data:text/html,test',
    'courses/course-a', '/\\evil.test', '/\n/evil.test', 'https://', 'https:///evil.test',
  ])('rejects unsafe or malformed CTA before either write: %j', async (ctaHref) => {
    const metadata = { ...base, title: overrides.title, ctaHref };
    await expect(createReel(metadata)).rejects.toThrow();
    await expect(updateReelMetadata(legacy.id, metadata)).rejects.toThrow();
    noWrites();
  });
});

describe('existing admin form and Server Action', () => {
  it('passes the new fields through the guarded creation action', async () => {
    expect(await saveReelAction(null, formData(overrides))).toBe(legacy.id);
    expect(s.guard).toHaveBeenCalledTimes(1);
    expect(s.add).toHaveBeenCalledExactlyOnceWith({ ...base, ...overrides, videoPath: '', published: false });
    expect(s.revalidate).toHaveBeenCalledWith('/admin/reels');
  });

  it.each(['javascript:', '//evil'])('rejects %s through the creation and editing action', async (ctaHref) => {
    for (const id of [null, legacy.id]) {
      await expect(saveReelAction(id, formData({ ...overrides, ctaHref }))).rejects.toThrow();
    }
    noWrites();
  });

  it('checks the existing admin guard before reading or writing metadata', async () => {
    s.guard.mockRejectedValue(new Error('forbidden'));
    await expect(saveReelAction(null, formData(overrides))).rejects.toThrow('forbidden');
    expect(s.collection).not.toHaveBeenCalled();
    noWrites();
  });

  it('rejects files supplied as text metadata', async () => {
    const data = formData(overrides);
    data.set('description', new File(['not text metadata'], 'description.txt'));
    await expect(saveReelAction(null, data)).rejects.toThrow();
    noWrites();
  });

  it.each([false, true])('shows optional fields and saved values in the form (editing=%s)', (editing) => {
    const reel = editing ? { ...legacy, ...overrides } : undefined;
    const node = ReelUploadForm({ courses: [course], reel });
    for (const name of ['title', 'description', 'ctaLabel', 'ctaHref'] as const) {
      const input = field(node, name);
      expect(input, `Missing ${name} field`).toBeDefined();
      expect(input!.props.required).not.toBe(true);
      expect(input!.props.defaultValue).toBe(editing ? overrides[name] : '');
    }
    expect(field(node, 'description')!.props.maxLength).toBe(300);
  });

  it('submits all text fields from the edit form without uploading the existing video', async () => {
    vi.stubGlobal('FormData', class extends NativeFormData {
      constructor(form?: { data: FormData }) {
        super();
        form?.data.forEach((value, key) => this.set(key, value));
      }
    });
    const data = formData(overrides);
    data.set('privateNote', 'must not be forwarded');
    const node = ReelUploadForm({ courses: [course], reel: legacy });
    await node.props.onSubmit({
      preventDefault: vi.fn(), currentTarget: { data, reset: vi.fn() },
    } as unknown as FormEvent<HTMLFormElement>);
    expect(s.update).toHaveBeenCalledExactlyOnceWith({ ...base, ...overrides });
    expect(s.add).not.toHaveBeenCalled();
    expect(s.refresh).toHaveBeenCalledTimes(1);
  });
});
