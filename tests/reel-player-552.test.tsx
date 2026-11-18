import React, { Children, isValidElement, type ReactElement, type EffectCallback } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReelPlayer } from '@/components/reels/reel-player';

const hooks = vi.hoisted(() => ({
  effects: [] as EffectCallback[], ref: { current: null as unknown }, setMuted: vi.fn(),
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: EffectCallback) => { hooks.effects.push(effect); },
  useRef: () => hooks.ref,
  useState: () => [true, hooks.setMuted],
}));

let dom: {
  hidden: boolean; body: { style: { overflow: string } }; documentElement: { style: { overflow: string } };
  addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>;
};
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  hooks.effects.length = 0;
  hooks.ref.current = null;
  dom = {
    hidden: false, body: { style: { overflow: 'scroll' } }, documentElement: { style: { overflow: 'auto' } },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('React', React);
  vi.stubGlobal('document', dom);
  vi.stubGlobal('window', { matchMedia: () => media });
});
afterEach(() => vi.unstubAllGlobals());

function findVideo(node: React.ReactNode): ReactElement<React.ComponentProps<'video'>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: React.ReactNode }>(child)) continue;
    if (child.type === 'video') return child as ReactElement<React.ComponentProps<'video'>>;
    const found = findVideo(child.props.children);
    if (found) return found;
  }
}
function mount() {
  const element = findVideo(ReelPlayer({ title: 'Рилс', video: '/video', poster: '/poster' }))!;
  const player = {
    muted: true, paused: true,
    play: vi.fn(async () => { player.paused = false; }),
    pause: vi.fn(() => { player.paused = true; }),
  };
  hooks.ref.current = player;
  return { element, player, runEffect: () => hooks.effects[0]() as () => void };
}

it('starts mobile playback muted, enables sound on a tap and restores scroll on close', () => {
  const { element, player, runEffect } = mount();
  expect(element.props).toMatchObject({ muted: true, playsInline: true, controls: true });
  const cleanup = runEffect();
  expect(player.play).toHaveBeenCalledOnce();
  expect(dom.body.style.overflow).toBe('hidden');
  expect(dom.documentElement.style.overflow).toBe('hidden');
  element.props.onClick!({ currentTarget: player } as unknown as React.MouseEvent<HTMLVideoElement>);
  expect(player.muted).toBe(false);
  expect(hooks.setMuted).toHaveBeenCalledWith(false);
  cleanup();
  expect(player.pause).toHaveBeenCalledOnce();
  expect(dom.body.style.overflow).toBe('scroll');
  expect(dom.documentElement.style.overflow).toBe('auto');
  expect(dom.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
});

it('keeps desktop playback manual and leaves document scrolling available', () => {
  media.matches = false;
  const { element, player, runEffect } = mount();
  const cleanup = runEffect();
  element.props.onClick!({ currentTarget: player } as unknown as React.MouseEvent<HTMLVideoElement>);
  expect(player.play).not.toHaveBeenCalled();
  expect(player.muted).toBe(true);
  expect(dom.body.style.overflow).toBe('scroll');
  expect(dom.documentElement.style.overflow).toBe('auto');
  cleanup();
});

it('pauses a hidden reel and resumes only playback that was running', () => {
  const { player, runEffect } = mount();
  const cleanup = runEffect();
  const visibility = dom.addEventListener.mock.calls.find(([name]) => name === 'visibilitychange')![1];
  dom.hidden = true;
  visibility();
  expect(player.paused).toBe(true);
  dom.hidden = false;
  visibility();
  expect(player.play).toHaveBeenCalledTimes(2);
  player.pause();
  dom.hidden = true;
  visibility();
  dom.hidden = false;
  visibility();
  expect(player.play).toHaveBeenCalledTimes(2);
  cleanup();
});

it('unlocks scrolling when the viewport becomes desktop-sized', () => {
  const { player, runEffect } = mount();
  const cleanup = runEffect();
  media.matches = false;
  media.addEventListener.mock.calls[0][1]();
  expect(player.paused).toBe(true);
  expect(dom.body.style.overflow).toBe('scroll');
  expect(dom.documentElement.style.overflow).toBe('auto');
  cleanup();
});
