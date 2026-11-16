// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { ReelPlayer, type ReelFeedItem } from '@/components/reels/reel-player';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics/track-client', () => ({ track: mocks.track }));
const item: ReelFeedItem = {
  reel: { id: 'reel-562', courseSlug: 'claude-code-agents', title: 'Ролик',
    videoPath: 'reels/video.mp4', order: 97, published: true },
  video: 'https://reels.test/video.mp4', poster: 'https://reels.test/poster.webp',
};
const props = {
  item, position: 7, isActive: true, isMuted: true,
  onToggleSound: () => {}, prefersReducedMotion: false,
};
const expected = { reel_id: 'reel-562', course_slug: 'claude-code-agents', position: 7 };
let notify: (entries: { isIntersecting: boolean; target: Element }[]) => void;

beforeEach(() => {
  mocks.track.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => Response.json({
    liked: options?.method === 'POST', likeCount: options?.method === 'POST' ? 1 : 0, isLoggedIn: true,
  })));
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(max-width: 767px)', addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof notify) { notify = callback; }
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('reel analytics contract (#562)', () => {
  it('declares the five stable names and the exact property types', () => {
    expect(EVENTS).toMatchObject({
      reelViewed: 'reel_view', reelCompleted: 'reel_complete', reelLiked: 'reel_like',
      reelShared: 'reel_share', reelCtaClicked: 'reel_cta_click',
    });
    expectTypeOf<ReelEventProps>().toEqualTypeOf<{
      reel_id: string; course_slug: string | null; position: number;
    }>();
  });

  it.each(['claude-code-agents', ''])('tracks share with exact properties (course=%s)', async (courseSlug) => {
    render(<ReelPlayer {...props} item={{ ...item, reel: { ...item.reel, courseSlug } }} />);
    expect(mocks.track).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Поделиться' }));
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_share', {
      ...expected, course_slug: courseSlug || null,
    });
  });

  it.each(['claude-code-agents', ''])('tracks confirmed addition with exact properties (course=%s)', async (courseSlug) => {
    render(<ReelPlayer {...props} item={{ ...item, reel: { ...item.reel, courseSlug } }} />);
    const like = screen.getByRole('button', { name: 'Лайк' });
    await waitFor(() => expect((like as HTMLButtonElement).disabled).toBe(false));
    expect(mocks.track).not.toHaveBeenCalled();
    await userEvent.click(like);
    await waitFor(() => expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_like', {
      ...expected, course_slug: courseSlug || null,
    }));
  });

  it.each(['claude-code-agents', ''])('tracks CTA with exact properties (course=%s)', async (courseSlug) => {
    render(<ReelPlayer {...props} item={{ ...item, reel: { ...item.reel, courseSlug } }} />);
    const link = screen.getByRole('link', { name: 'К курсу' });
    expect(link.getAttribute('href')).toBe(courseSlug ? `/courses/${courseSlug}` : '/courses');
    link.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(link);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_cta_click', {
      ...expected, course_slug: courseSlug || null,
    });
  });

  it('tracks one view per display despite repeated observer entries and counts a return', () => {
    const second = { ...item, reel: { ...item.reel, id: 'second', courseSlug: '' } };
    const { container } = render(<ReelsMobileFeed items={[item, second]} />);
    const sections = container.querySelectorAll('section[data-reel-id]');
    for (let i = 0; i < 3; i++) act(() => notify([{ isIntersecting: true, target: sections[0] }]));
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_view', { ...expected, position: 0 });
    act(() => notify([{ isIntersecting: true, target: sections[1] }]));
    expect(mocks.track).toHaveBeenNthCalledWith(2, 'reel_view', {
      reel_id: 'second', course_slug: null, position: 1,
    });
    act(() => notify([{ isIntersecting: true, target: sections[0] }]));
    expect(mocks.track).toHaveBeenNthCalledWith(3, 'reel_view', { ...expected, position: 0 });
    expect(mocks.track).toHaveBeenCalledTimes(3);
  });

  it('tracks ended once per display and resets after leaving the reel', () => {
    const { container, rerender } = render(<ReelPlayer {...props} />);
    const video = container.querySelector('video')!;
    fireEvent.ended(video);
    fireEvent.ended(video);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_complete', expected);
    rerender(<ReelPlayer {...props} isActive={false} />);
    fireEvent.ended(video);
    expect(mocks.track).toHaveBeenCalledTimes(1);
    rerender(<ReelPlayer {...props} />);
    fireEvent.ended(video);
    expect(mocks.track).toHaveBeenCalledTimes(2);
  });

  it('detects completion of looping video, deduplicates later loops and ignores seeking', () => {
    const { container } = render(<ReelPlayer {...props} />);
    const video = container.querySelector('video')!;
    expect(video.loop).toBe(true);
    Object.defineProperty(video, 'duration', { value: 10 });
    const tick = (currentTime: number, seeking = false) => {
      video.currentTime = currentTime;
      Object.defineProperty(video, 'seeking', { configurable: true, value: seeking });
      fireEvent.timeUpdate(video);
    };
    tick(4);
    tick(1, true);
    expect(mocks.track).not.toHaveBeenCalled();
    tick(9.9);
    tick(0.1);
    tick(9.9);
    tick(0.1);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_complete', expected);
  });
});
