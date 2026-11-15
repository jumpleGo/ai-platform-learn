import React, { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/admin/reels/[reelId]/upload/route';
import { MAX_REEL_BYTES } from '@/lib/reel-upload';

const s = vi.hoisted(() => ({
  guard: vi.fn(), get: vi.fn(), attach: vi.fn(), save: vi.fn(), remove: vi.fn(),
  file: vi.fn(), bucket: vi.fn(), metadata: vi.fn(), create: vi.fn(), update: vi.fn(), refresh: vi.fn(),
}));
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/require-admin', () => ({ requireAdmin: s.guard }));
vi.mock('@/lib/db/reels', () => ({ getReel: s.get, setReelVideoPath: s.attach, createReel: s.create, updateReelMetadata: s.update }));
vi.mock('@/lib/firebase/admin', () => ({ adminStorage: { bucket: s.bucket }, storageBucketName: 'test-bucket' }));
vi.mock('@/app/admin/reels/actions', () => ({ saveReelAction: s.metadata }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: s.refresh }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
// Invoke the real form handler with persistent hook slots, without adding a DOM dependency.
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

const oldPath = 'reels/reel-1/123e4567-e89b-42d3-a456-426614174000.mp4';
function bytes() {
  const b = Buffer.alloc(20); b.writeUInt32BE(16); b.write('ftyp', 4); b.write('isom', 8); return b;
}
const upload = () => POST(new Request('https://gelato.education/api/admin/reels/reel-1/upload', {
  method: 'POST', body: new Uint8Array(bytes()),
}), { params: Promise.resolve({ reelId: 'reel-1' }) });

class Xhr {
  static instances: Xhr[] = [];
  upload = { onprogress: null as null | ((e: { loaded: number; total: number; lengthComputable: boolean }) => void) };
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  onabort: null | (() => void) = null;
  ontimeout: null | (() => void) = null;
  status = 200;
  responseText = '{}';
  open = vi.fn(); setRequestHeader = vi.fn(); send = vi.fn();
  constructor() { Xhr.instances.push(this); }
}
const NativeFormData = globalThis.FormData;
function submitEvent(file = new File([bytes()], 'clip.mp4', { type: 'video/mp4' })) {
  const data = new NativeFormData();
  data.set('title', 'A reel'); data.set('order', '2'); data.set('courseSlug', 'course-a'); data.set('video', file);
  return { preventDefault: vi.fn(), currentTarget: { data, reset: vi.fn() } } as unknown as React.FormEvent<HTMLFormElement>;
}
async function form() {
  hooks.cursor = 0;
  const { ReelUploadForm } = await import('@/app/admin/reels/reel-upload-form');
  return ReelUploadForm({ courses: [{ slug: 'course-a', title: 'Course A' }] });
}
function find(node: ReactNode, predicate: (el: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const result = find(child, predicate); if (result) return result;
  }
}
const submit = (node: ReactElement, event = submitEvent()) =>
  (node.props as { onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> }).onSubmit(event);

beforeEach(() => {
  vi.resetAllMocks(); hooks.slots = []; hooks.cursor = 0; Xhr.instances = [];
  s.get.mockResolvedValue({ id: 'reel-1', videoPath: oldPath });
  s.bucket.mockReturnValue({ file: s.file }); s.file.mockReturnValue({ save: s.save, delete: s.remove });
  s.metadata.mockResolvedValue('reel-1'); s.create.mockResolvedValue('reel-1');
  vi.stubGlobal('React', React); vi.stubGlobal('XMLHttpRequest', Xhr);
  vi.stubGlobal('FormData', class extends NativeFormData {
    constructor(form?: { data: FormData }) {
      super(); if (form) form.data.forEach((value, key) => this.set(key, value));
    }
  });
});
afterEach(() => vi.unstubAllGlobals());

it('re-upload deletes exactly the recorded object of this reel after save and attachment', async () => {
  const response = await upload(); expect(response.status).toBe(200);
  const { videoPath } = await response.json();
  expect(videoPath).not.toBe(oldPath);
  expect(s.file.mock.calls.map(([path]) => path)).toEqual([videoPath, oldPath]);
  expect(s.remove).toHaveBeenCalledExactlyOnceWith({ ignoreNotFound: true });
  expect(s.save.mock.invocationCallOrder[0]).toBeLessThan(s.attach.mock.invocationCallOrder[0]);
  expect(s.attach.mock.invocationCallOrder[0]).toBeLessThan(s.remove.mock.invocationCallOrder[0]);
});
it.each(['reels/other/123e4567-e89b-42d3-a456-426614174000.mp4', 'reels/reel-1/../other.mp4', 'previews/reel-1/a.mp4'])('never deletes an unowned recorded path: %s', async videoPath => {
  s.get.mockResolvedValue({ id: 'reel-1', videoPath });
  expect((await upload()).status).toBe(200); expect(s.remove).not.toHaveBeenCalled();
  expect(s.file).toHaveBeenCalledTimes(1);
});
it('keeps the old object when saving the new object fails', async () => {
  s.save.mockRejectedValue(new Error('storage unavailable'));
  expect((await upload()).status).toBe(500);
  expect(s.attach).not.toHaveBeenCalled(); expect(s.remove).not.toHaveBeenCalled();
  expect(s.file).toHaveBeenCalledTimes(1);
});
it('keeps the old object when attaching the new path fails', async () => {
  s.attach.mockRejectedValue(new Error('Firestore unavailable'));
  expect((await upload()).status).toBe(500); expect(s.remove).not.toHaveBeenCalled();
});
it('reports cleanup failure without treating the saved upload as failed', async () => {
  s.remove.mockRejectedValue(new Error('storage unavailable'));
  const response = await upload(); expect(response.status).toBe(200);
  expect(await response.json()).toHaveProperty('warning');
});

it('ignores a repeated submit throughout metadata and upload, and disables the button', async () => {
  let finishMetadata!: (id: string) => void;
  s.metadata.mockReturnValue(new Promise<string>(resolve => { finishMetadata = resolve; }));
  const node = await form(); const event = submitEvent();
  const first = submit(node, event); await submit(node, event);
  expect(s.metadata).toHaveBeenCalledTimes(1);
  expect(find(await form(), el => el.props.type === 'submit')?.props.disabled).toBe(true);
  expect(s.metadata.mock.calls[0][1].get('video')).toBeNull();
  finishMetadata('reel-1');
  await vi.waitFor(() => expect(Xhr.instances).toHaveLength(1));
  await submit(node, event);
  expect(Xhr.instances).toHaveLength(1);
  expect(Xhr.instances[0].send).toHaveBeenCalledExactlyOnceWith((event.currentTarget as unknown as { data: FormData }).data.get('video'));
  Xhr.instances[0].onload!(); await first;
  expect(find(await form(), el => el.props.type === 'submit')?.props.disabled).toBe(false);
});
it('renders progress from real uploaded bytes and stays busy at 100 percent until the response', async () => {
  const first = submit(await form());
  await vi.waitFor(() => expect(Xhr.instances).toHaveLength(1));
  const xhr = Xhr.instances[0];
  xhr.upload.onprogress!({ loaded: 4, total: 10, lengthComputable: true });
  const progress = find(await form(), el => el.type === 'progress');
  expect(progress?.props.value).toBe(4); expect(progress?.props.max).toBe(10);
  xhr.upload.onprogress!({ loaded: 10, total: 10, lengthComputable: true });
  expect(find(await form(), el => el.props.type === 'submit')?.props.disabled).toBe(true);
  xhr.onload!(); await first;
});
it.each([
  () => new File([new Uint8Array(MAX_REEL_BYTES + 1)], 'big.mp4', { type: 'video/mp4' }),
  () => new File([bytes()], 'clip.mov', { type: 'video/quicktime' }),
  () => new File([], 'empty.mp4', { type: 'video/mp4' }),
])('rejects invalid video before metadata or network writes', async makeFile => {
  await submit(await form(), submitEvent(makeFile()));
  expect(s.metadata).not.toHaveBeenCalled(); expect(Xhr.instances).toHaveLength(0);
});
it('retries a failed upload with the existing draft id', async () => {
  const first = submit(await form()); await vi.waitFor(() => expect(Xhr.instances).toHaveLength(1));
  Xhr.instances[0].onerror!(); await first;
  const second = submit(await form()); await vi.waitFor(() => expect(Xhr.instances).toHaveLength(2));
  expect(s.metadata.mock.calls.map(([id]) => id)).toEqual([null, 'reel-1']);
  Xhr.instances[1].onload!(); await second; expect(s.refresh).toHaveBeenCalledTimes(1);
});
it('guards the metadata action before creating a draft', async () => {
  const { saveReelAction } = await vi.importActual<typeof import('@/app/admin/reels/actions')>('@/app/admin/reels/actions');
  s.guard.mockRejectedValue(new Error('forbidden'));
  await expect(saveReelAction(null, new NativeFormData())).rejects.toThrow('forbidden');
  expect(s.create).not.toHaveBeenCalled(); expect(s.update).not.toHaveBeenCalled();
});
it('parses metadata without uploading a file through the server action', async () => {
  const { saveReelAction } = await vi.importActual<typeof import('@/app/admin/reels/actions')>('@/app/admin/reels/actions');
  const data = new NativeFormData(); data.set('title', ' A reel '); data.set('courseSlug', 'course-a'); data.set('order', '2');
  expect(await saveReelAction(null, data)).toBe('reel-1');
  expect(s.create).toHaveBeenCalledWith({ title: 'A reel', courseSlug: 'course-a', order: 2 });
  data.set('order', ''); await expect(saveReelAction(null, data)).rejects.toThrow();
  expect(s.create).toHaveBeenCalledTimes(1);
});
