// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ReelsPage from '@/app/reels/page';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/analytics/track-client', () => ({ track: mocks.track }));
vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [{
  id: 'saved-reel', title: 'Сохранённый ролик', courseSlug: 'course-a',
  videoPath: 'video.mp4', order: 97, published: true, likeCount: 4,
}] }));
vi.mock('@/lib/firebase/admin', () => ({
  storageBucketName: 'test', adminStorage: { bucket: () => ({ file: () => ({
    getSignedUrl: async () => ['https://example.test/video.mp4'],
  }) }) },
}));
vi.mock('@/components/gelato-logo', () => ({ GelatoLogo: () => <span>GELATO</span> }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('React', React);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([390, 1280])('delivers the saved reaction to the displayed page control at %i px', async (width) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 390 && query === '(max-width: 767px)',
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ liked: true, likeCount: 8, isLoggedIn: true }))
    .mockResolvedValueOnce(Response.json({ liked: false, likeCount: 7 }));
  vi.stubGlobal('fetch', fetchMock);
  const { container } = render(await ReelsPage());
  const presentation = container.querySelector(width === 390 ? 'section[data-reel-id]' : 'article')!;
  const button = within(presentation as HTMLElement).getByRole('button', { name: 'Лайк' });
  await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  expect(button.textContent).toBe('8');
  expect(fetchMock).toHaveBeenCalledTimes(1); // desktop and mobile share the read
  await userEvent.click(button);
  await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('false'));
  expect(button.textContent).toBe('7');
  expect(mocks.track.mock.calls.filter(([event]) => event === 'reel_like')).toHaveLength(0);
});
