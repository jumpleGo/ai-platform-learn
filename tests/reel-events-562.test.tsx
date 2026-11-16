import React from 'react';
import Link from 'next/link';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { ReelActions } from '@/components/reels/reel-actions';
import { ReelCta } from '@/components/reels/reel-cta';
import { ReelPlayer, type ReelFeedItem } from '@/components/reels/reel-player';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';

const mocks = vi.hoisted(() => ({ track: vi.fn(), hooks: null as HookHarness | null }));
vi.mock('@/lib/analytics/track-client', () => ({ track: mocks.track }));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  return {
    ...actual,
    useRef: (initial: unknown) => mocks.hooks?.ref(initial) ?? actual.useRef(initial),
    useState: (initial: unknown) => mocks.hooks?.state(initial) ?? actual.useState(initial),
    useEffect: (setup: React.EffectCallback, deps?: React.DependencyList) => {
      if (mocks.hooks) mocks.hooks.effect(setup, deps);
      else actual.useEffect(setup, deps);
    },
  };
});

type Effect = { setup: React.EffectCallback; deps?: React.DependencyList; cleanup?: () => void };
// Persistent hook slots, dependency comparison and attached refs exercise real
// handlers/effects in Node, without a browser dependency or source/git reads.
class HookHarness {
  private slots: unknown[] = [];
  private cursor = 0;
  private pending: Effect[] = [];

  ref(initial: unknown) {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = { current: initial };
    return this.slots[index];
  }

  state(initial: unknown) {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = initial;
    return [this.slots[index], (value: unknown) => {
      this.slots[index] = typeof value === 'function' ? value(this.slots[index]) : value;
    }];
  }

  effect(setup: React.EffectCallback, deps?: React.DependencyList) {
    const index = this.cursor++;
    const previous = this.slots[index] as Effect | undefined;
    if (previous?.deps && deps && deps.length === previous.deps.length
      && deps.every((dep, i) => Object.is(dep, previous.deps![i]))) return;
    const effect = { setup, deps, cleanup: previous?.cleanup };
    this.slots[index] = effect;
    this.pending.push(effect);
  }

  render(component: () => React.ReactNode) {
    this.cursor = 0;
    this.pending = [];
    mocks.hooks = this;
    try { return component(); }
    finally { mocks.hooks = null; }
  }

  flush() {
    for (const effect of this.pending) effect.cleanup?.();
    for (const effect of this.pending) effect.cleanup = effect.setup() || undefined;
  }
}

function find<P extends object>(node: React.ReactNode, type: React.ElementType): React.ReactElement<P> {
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    if (node.type === type) return node as React.ReactElement<P>;
    for (const child of React.Children.toArray(node.props.children)) {
      try { return find<P>(child, type); } catch { /* Continue through siblings. */ }
    }
  }
  throw new Error(`Missing element: ${String(type)}`);
}

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

beforeEach(() => {
  mocks.track.mockClear();
  vi.stubGlobal('window', { matchMedia: (query: string) => ({
    matches: query === '(max-width: 767px)', addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) });
});
afterEach(() => { mocks.hooks = null; vi.unstubAllGlobals(); });

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

  it.each(['claude-code-agents', ''])('tracks share with exact properties (course=%s)', (courseSlug) => {
    const tree = new HookHarness().render(() => ReelPlayer({
      ...props, item: { ...item, reel: { ...item.reel, courseSlug } },
    }));
    const actions = find<React.ComponentProps<typeof ReelActions>>(tree, ReelActions);
    const buttons = React.Children.toArray(ReelActions(actions.props).props.children)
      .filter((child) => React.isValidElement<React.ComponentProps<'button'>>(child)
        && child.props['aria-label'] === 'Поделиться') as React.ReactElement<React.ComponentProps<'button'>>[];
    expect(mocks.track).not.toHaveBeenCalled();
    expect(buttons[0]?.props.onClick).toBeTypeOf('function');
    buttons[0].props.onClick!({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_share', {
      ...expected, course_slug: courseSlug || null,
    });
  });

  it('tracks like with exact properties', () => {
    const tree = new HookHarness().render(() => ReelPlayer(props));
    const actions = find<React.ComponentProps<typeof ReelActions>>(tree, ReelActions);
    const buttons = React.Children.toArray(ReelActions(actions.props).props.children)
      .filter((child) => React.isValidElement<React.ComponentProps<'button'>>(child)
        && child.props['aria-label'] === 'Лайк') as React.ReactElement<React.ComponentProps<'button'>>[];
    expect(mocks.track).not.toHaveBeenCalled();
    expect(buttons[0]?.props.onClick).toBeTypeOf('function');
    buttons[0].props.onClick!({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_like', expected);

    mocks.track.mockClear();
    const treeNoCourse = new HookHarness().render(() => ReelPlayer({
      ...props, item: { ...item, reel: { ...item.reel, courseSlug: '' } },
    }));
    const actionsNoCourse = find<React.ComponentProps<typeof ReelActions>>(treeNoCourse, ReelActions);
    const buttonsNoCourse = React.Children.toArray(ReelActions(actionsNoCourse.props).props.children)
      .filter((child) => React.isValidElement<React.ComponentProps<'button'>>(child)
        && child.props['aria-label'] === 'Лайк') as React.ReactElement<React.ComponentProps<'button'>>[];
    buttonsNoCourse[0].props.onClick!({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_like', { ...expected, course_slug: null });
  });

  it.each(['claude-code-agents', ''])('tracks CTA with exact properties (course=%s)', (courseSlug) => {
    const tree = new HookHarness().render(() => ReelPlayer({
      ...props, item: { ...item, reel: { ...item.reel, courseSlug } },
    }));
    const cta = find<React.ComponentProps<typeof ReelCta>>(tree, ReelCta);
    const link = find<React.ComponentProps<typeof Link>>(ReelCta(cta.props), Link);
    expect(link.props.href).toBe(`/courses/${courseSlug}`);
    expect(mocks.track).not.toHaveBeenCalled();
    expect(link.props.onClick).toBeTypeOf('function');
    link.props.onClick!({} as React.MouseEvent<HTMLAnchorElement>);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_cta_click', {
      ...expected, course_slug: courseSlug || null,
    });
  });

  it('tracks one view per display despite repeated observer entries and counts a return', () => {
    const second = { ...item, reel: { ...item.reel, id: 'second', courseSlug: '' } };
    const sections = [{}, {}];
    let notify: (entries: { isIntersecting: boolean; target: object }[]) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof notify) { notify = callback; }
      observe() {}
      disconnect() {}
    });
    const container = { querySelectorAll: () => sections };
    const harness = new HookHarness();
    const render = () => {
      const tree = harness.render(() => ReelsMobileFeed({ items: [item, second] }));
      if (React.isValidElement<{ ref?: React.RefObject<unknown> }>(tree) && tree.props.ref) {
        tree.props.ref.current = container;
      }
      harness.flush();
      return tree;
    };
    render(); // Viewport detection.
    expect(mocks.track).not.toHaveBeenCalled();
    const tree = render();
    const firstPlayer = find<React.ComponentProps<typeof ReelPlayer>>(tree, ReelPlayer);
    expect(firstPlayer.props.position).toBe(0); // Feed index, not stored order=97.
    for (let i = 0; i < 3; i++) {
      notify([{ isIntersecting: true, target: sections[0] }]);
      render();
    }
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_view', { ...expected, position: 0 });
    notify([{ isIntersecting: true, target: sections[1] }]);
    render();
    expect(mocks.track).toHaveBeenNthCalledWith(2, 'reel_view', {
      reel_id: 'second', course_slug: null, position: 1,
    });
    notify([{ isIntersecting: true, target: sections[0] }]);
    render();
    expect(mocks.track).toHaveBeenNthCalledWith(3, 'reel_view', { ...expected, position: 0 });
    expect(mocks.track).toHaveBeenCalledTimes(3);
  });

  it('tracks ended once per display and resets after leaving the reel', () => {
    const harness = new HookHarness();
    const render = (isActive: boolean) => {
      const tree = harness.render(() => ReelPlayer({ ...props, isActive }));
      harness.flush();
      return find<React.ComponentProps<'video'>>(tree, 'video');
    };
    const video = render(true);
    expect(video.props.onEnded).toBeTypeOf('function');
    video.props.onEnded!({} as React.SyntheticEvent<HTMLVideoElement>);
    video.props.onEnded!({} as React.SyntheticEvent<HTMLVideoElement>);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith('reel_complete', expected);
    const inactive = render(false);
    inactive.props.onEnded!({} as React.SyntheticEvent<HTMLVideoElement>);
    expect(mocks.track).toHaveBeenCalledTimes(1);
    render(true).props.onEnded!({} as React.SyntheticEvent<HTMLVideoElement>);
    expect(mocks.track).toHaveBeenCalledTimes(2);
  });

  it('detects completion of looping video, deduplicates later loops and ignores seeking', () => {
    const tree = new HookHarness().render(() => ReelPlayer(props));
    const video = find<React.ComponentProps<'video'>>(tree, 'video');
    expect(video.props.loop).toBe(true);
    expect(video.props.onTimeUpdate).toBeTypeOf('function');
    const tick = (currentTime: number, seeking = false) => video.props.onTimeUpdate!({
      currentTarget: { currentTime, duration: 10, seeking },
    } as React.SyntheticEvent<HTMLVideoElement>);
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
