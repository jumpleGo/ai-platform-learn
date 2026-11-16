// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelActions as CurrentReelActions } from '@/components/reels/reel-actions';
import { ReelLikesProvider } from '@/components/reels/reel-likes-provider';
import { OldReelActions } from './fixtures/reel-actions-5a75165';

// Optional reproducible negative run, using only the attributed local fixture.
const ReelActions = process.env.REEL_LIKE_USE_OLD === '1' ? OldReelActions : CurrentReelActions;

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics/track-client', () => ({ track: mocks.track }));
const eventProps = { reel_id: 'reel-1', course_slug: 'course-a', position: 7 };
const response = (liked: boolean, likeCount: number, isLoggedIn = true) =>
  Response.json({ liked, likeCount, isLoggedIn });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('confirmed reel reaction #560', () => {
  it('shares pending and confirmed state between computer and mobile controls', async () => {
    const added = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(false, 4)).mockReturnValueOnce(added.promise);
    render(<ReelLikesProvider>
      <ReelActions eventProps={eventProps} initialLikeCount={4} layout="inline" />
      <ReelActions eventProps={eventProps} initialLikeCount={4} />
    </ReelLikesProvider>);
    const buttons = screen.getAllByRole('button', { name: 'Лайк' }) as HTMLButtonElement[];
    await waitFor(() => expect(buttons.every((button) => !button.disabled)).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    await act(async () => added.resolve(response(true, 5)));
    for (const button of buttons) {
      expect(button.textContent).toBe('5');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    }
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_like', eventProps);
  });

  it('loads a saved like and blocks clicks until the delayed read finishes', async () => {
    const read = deferred<Response>();
    fetchMock.mockReturnValueOnce(read.promise);
    render(<ReelActions eventProps={eventProps} initialLikeCount={4} />);
    const button = screen.getByRole('button', { name: 'Лайк' });
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method ?? 'GET').toBe('GET');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await act(async () => read.resolve(response(true, 8)));
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toBe('8');
    expect(button.querySelector('svg')?.classList.contains('fill-red-500')).toBe(true);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it.each(['course-a', null])('serializes rapid clicks and emits exact props only after adding (course=%s)', async (course_slug) => {
    const added = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(false, 4)).mockReturnValueOnce(added.promise)
      .mockResolvedValueOnce(response(false, 4));
    render(<ReelActions eventProps={{ ...eventProps, course_slug }} initialLikeCount={4} />);
    const button = screen.getByRole('button', { name: 'Лайк' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    await userEvent.dblClick(button);
    expect(fetchMock).toHaveBeenCalledTimes(2); // one GET, one POST
    expect(button.textContent).toBe('4');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(mocks.track).not.toHaveBeenCalled();
    await act(async () => added.resolve(response(true, 5)));
    expect(button.textContent).toBe('5');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_like', { ...eventProps, course_slug });
    await userEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('false'));
    expect(button.textContent).toBe('4');
    expect(mocks.track).toHaveBeenCalledTimes(1); // removing is not adding
  });

  it('recovers the server state after a lost POST response without reporting success', async () => {
    const recovery = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(false, 4))
      .mockRejectedValueOnce(new Error('connection lost after commit'))
      .mockReturnValueOnce(recovery.promise);
    render(<ReelActions eventProps={eventProps} initialLikeCount={4} />);
    const button = screen.getByRole('button', { name: 'Лайк' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(button.textContent).toBe('4');
    await act(async () => recovery.resolve(response(true, 5)));
    expect(button.textContent).toBe('5');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Не удалось');
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('keeps the confirmed state and requires a successful reread after both requests fail', async () => {
    fetchMock.mockResolvedValueOnce(response(true, 8))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response(true, 9));
    render(<ReelActions eventProps={eventProps} initialLikeCount={4} />);
    const button = screen.getByRole('button', { name: 'Лайк' });
    await waitFor(() => expect(button.textContent).toBe('8'));
    await userEvent.click(button);
    await screen.findByRole('button', { name: 'Повторить загрузку' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toBe('8');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }));
    await waitFor(() => expect(button.textContent).toBe('9'));
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('shows a guest count and login invitation without POST or reel_like', async () => {
    fetchMock.mockResolvedValueOnce(response(false, 42, false));
    render(<ReelActions eventProps={eventProps} initialLikeCount={42} />);
    const link = await screen.findByRole('link', { name: 'Войти, чтобы поставить лайк' });
    expect(link.getAttribute('href')).toBe('/login');
    expect(screen.queryByRole('button', { name: 'Лайк' })).toBeNull();
    link.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(link);
    expect(screen.getByText('42')).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('ignores a delayed response for the previous reel after navigation', async () => {
    const oldRead = deferred<Response>();
    fetchMock.mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce(response(false, 12));
    const { rerender } = render(<ReelActions eventProps={eventProps} />);
    rerender(<ReelActions eventProps={{ ...eventProps, reel_id: 'second' }} />);
    const button = screen.getByRole('button', { name: 'Лайк' });
    await waitFor(() => expect(button.textContent).toBe('12'));
    await act(async () => oldRead.resolve(response(true, 99)));
    expect(button.textContent).toBe('12');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('rejects malformed success data and restores the confirmed state without an event', async () => {
    fetchMock.mockResolvedValueOnce(response(false, 4))
      .mockResolvedValueOnce(Response.json({ liked: true, likeCount: -1 }))
      .mockResolvedValueOnce(response(false, 4));
    render(<ReelActions eventProps={eventProps} initialLikeCount={4} />);
    const button = screen.getByRole('button', { name: 'Лайк' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.textContent).toBe('4');
    expect(mocks.track).not.toHaveBeenCalled();
  });
});

// The same observable requirements reject a small, attributed old component.
// These run normally in CI; no Git checkout or source rewriting is needed.
describe('old mounted reproduction from 5a75165', () => {
  it('exposes the former missing saved-state read', async () => {
    fetchMock.mockResolvedValue(response(true, 8));
    render(<OldReelActions eventProps={eventProps} initialLikeCount={4} />);
    expect(() => expect(fetchMock).toHaveBeenCalledTimes(1)).toThrow();
    expect(screen.getByRole('button', { name: 'Лайк' }).textContent).toBe('4');
  });

  it('rejects the old request count and pre-success event with the same assertions', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    render(<OldReelActions eventProps={eventProps} initialLikeCount={4} />);
    await userEvent.dblClick(screen.getByRole('button', { name: 'Лайк' }));
    expect(() => expect(fetchMock).toHaveBeenCalledTimes(1)).toThrow();
    expect(() => expect(mocks.track).not.toHaveBeenCalled()).toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.track).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(response(true, 5)));
  });
});
