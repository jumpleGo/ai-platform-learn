import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelPlayer, type ReelFeedItem } from '@/components/reels/reel-player';
import { ReelsMobileFeed } from '@/components/reels/reels-mobile-feed';
import { ReelPlayer560d424 } from './fixtures/reel-player-560d424';

// Run the same assertions against the frozen component with
// REELS_PLAYBACK_BASELINE=560d424 npx vitest run tests/reels-playback-571.test.tsx
const PlaybackPlayer = process.env.REELS_PLAYBACK_BASELINE === '560d424'
  ? ReelPlayer560d424 : ReelPlayer;

type Player = typeof ReelPlayer;
type PlayerProps = React.ComponentProps<Player>;
type Effect = {
  setup: React.EffectCallback;
  deps?: React.DependencyList;
  cleanup?: () => void;
};

const hooks = vi.hoisted(() => ({ current: null as PlaybackHarness | null }));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  return {
    ...actual,
    useRef: (initial: unknown) => hooks.current ? hooks.current.ref(initial) : actual.useRef(initial),
    useEffect: (setup: React.EffectCallback, deps?: React.DependencyList) => {
      if (hooks.current) hooks.current.effect(setup, deps);
      else actual.useEffect(setup, deps);
    },
  };
});

const item: ReelFeedItem = {
  reel: {
    id: 'first', title: 'Первое видео про агентов', courseSlug: 'claude-code-agents',
    videoPath: 'reels/first/video.mp4', published: true, order: 0,
  },
  video: 'https://reels.test/first.mp4', poster: 'https://reels.test/first.webp',
};
const props: PlayerProps = {
  item, isActive: true, isMuted: true, onToggleSound: () => {}, prefersReducedMotion: false,
};

function findVideo(node: React.ReactNode): React.ReactElement<React.ComponentProps<'video'>> | undefined {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return;
  if (node.type === 'video') return node as React.ReactElement<React.ComponentProps<'video'>>;
  for (const child of React.Children.toArray(node.props.children)) {
    const video = findVideo(child);
    if (video) return video;
  }
}

// Execute the real component's effects with persistent refs, Object.is dependency
// comparison, refs attached before effects, and all cleanups before new setups.
// Media methods are spies: assertions cover calls and paused state, not markup.
class PlaybackHarness {
  private slots: unknown[] = [];
  private cursor = 0;
  private pending: Effect[] = [];
  private node?: React.ReactElement<React.ComponentProps<'video'>>;
  private props = props;
  readonly video = {
    muted: true,
    paused: true,
    play: vi.fn(() => { this.video.paused = false; return Promise.resolve(); }),
    pause: vi.fn(() => { this.video.paused = true; }),
  };

  ref(initial: unknown) {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = { current: initial };
    return this.slots[index];
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

  render(Player: Player, patch: Partial<PlayerProps> = {}) {
    this.props = { ...this.props, ...patch };
    this.cursor = 0;
    this.pending = [];
    hooks.current = this;
    this.node = findVideo(Player(this.props));
    expect(this.node).toBeDefined();
    const ref = this.node!.props.ref as React.RefObject<unknown>;
    ref.current = this.video;
    for (const effect of this.pending) effect.cleanup?.();
    for (const effect of this.pending) effect.cleanup = effect.setup() || undefined;
  }

  click() {
    this.node!.props.onClick!({} as React.MouseEvent<HTMLVideoElement>);
  }

  unmount() {
    for (const slot of this.slots) (slot as Effect).cleanup?.();
  }
}

beforeEach(() => {
  hooks.current = null;
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
});
afterEach(() => { hooks.current = null; vi.unstubAllGlobals(); });

function assertSoundDoesNotInterrupt(Player: Player) {
  const harness = new PlaybackHarness();
  harness.render(Player);
  expect(harness.video.play).toHaveBeenCalledTimes(1);
  harness.video.play.mockClear();
  harness.video.pause.mockClear();
  for (const isMuted of [false, true]) {
    harness.render(Player, { isMuted });
    expect(harness.video.muted).toBe(isMuted);
    expect(harness.video.pause).not.toHaveBeenCalled();
    expect(harness.video.play).not.toHaveBeenCalled();
    expect(harness.video.paused).toBe(false);
  }
}

function assertManualPauseSurvives(Player: Player) {
  const harness = new PlaybackHarness();
  harness.render(Player);
  harness.click();
  expect(harness.video.paused).toBe(true);
  harness.video.play.mockClear();
  harness.render(Player, { isMuted: false });
  harness.render(Player, { isActive: false });
  harness.render(Player, { isActive: true });
  harness.render(Player, { prefersReducedMotion: true });
  harness.render(Player, { prefersReducedMotion: false });
  expect(harness.video.play).not.toHaveBeenCalled();
  expect(harness.video.paused).toBe(true);
  // Only another deliberate video click clears the student's pause.
  harness.click();
  expect(harness.video.play).toHaveBeenCalledTimes(1);
  expect(harness.video.paused).toBe(false);
}

describe('reels playback effects (#571)', () => {
  it('changes sound without pause or another play request', () => assertSoundDoesNotInterrupt(PlaybackPlayer));
  it('preserves manual pause across sound, visibility and preference changes', () => assertManualPauseSurvives(PlaybackPlayer));

  it('still pauses inactive and unmounted video, and resumes automatically paused video', () => {
    const harness = new PlaybackHarness();
    harness.render(PlaybackPlayer);
    harness.render(PlaybackPlayer, { isActive: false });
    expect(harness.video.paused).toBe(true);
    harness.render(PlaybackPlayer, { isActive: true });
    expect(harness.video.paused).toBe(false);
    harness.unmount();
    expect(harness.video.paused).toBe(true);
  });

  it('does not request autoplay with reduced motion, but permits a deliberate click', () => {
    const harness = new PlaybackHarness();
    harness.render(PlaybackPlayer, { prefersReducedMotion: true });
    expect(harness.video.play).not.toHaveBeenCalled();
    harness.click();
    expect(harness.video.play).toHaveBeenCalledTimes(1);
  });
});

describe('first reel before viewport detection (#571)', () => {
  it('server-renders only the first poster and title without a mobile video', () => {
    vi.unstubAllGlobals();
    const second = { ...item, reel: { ...item.reel, id: 'second', title: 'Второе видео' } };
    const html = renderToStaticMarkup(<ReelsMobileFeed items={[item, second]} />);
    expect(html).toContain(`src="${item.poster}"`);
    expect(html).toContain(item.reel.title);
    expect(html).toContain('md:hidden');
    expect(html).not.toContain('Второе видео');
    expect(html).not.toMatch(/<video\b/);
  });

  it.each([390, 1280])('uses identical server and initial client markup at %i px', (width) => {
    vi.unstubAllGlobals();
    const server = renderToString(<ReelsMobileFeed items={[item]} />);
    const matchMedia = vi.fn(() => ({ matches: width < 768 }));
    vi.stubGlobal('window', { matchMedia });
    const client = renderToString(<ReelsMobileFeed items={[item]} />);
    expect(client).toBe(server);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('renders no placeholder for an empty feed', () => {
    expect(renderToStaticMarkup(<ReelsMobileFeed items={[]} />)).toBe('');
  });
});
