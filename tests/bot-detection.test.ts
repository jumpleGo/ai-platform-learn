import { createHash } from 'node:crypto';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isBot } from '@/lib/analytics/bot-detection';
import { EVENTS } from '@/lib/analytics/events';
import fixture from './fixtures/bot-detection-before.json';

type Call = unknown[];

function mockSdk() {
  const calls: Call[] = [];
  const sdk = {
    __loaded: true,
    init: vi.fn((...args: unknown[]) => { calls.push(['init', ...args]); }),
    register: vi.fn((...args: unknown[]) => { calls.push(['register', ...args]); }),
    register_once: vi.fn((...args: unknown[]) => { calls.push(['register_once', ...args]); }),
    capture: vi.fn((...args: unknown[]) => { calls.push(['capture', ...args]); }),
    identify: vi.fn((...args: unknown[]) => { calls.push(['identify', ...args]); }),
    reset: vi.fn((...args: unknown[]) => { calls.push(['reset', ...args]); }),
    get_distinct_id: vi.fn(() => 'visitor-test'),
  };
  return { sdk, calls };
}

describe('распознавание ботов и ИИ-краулеров (#689)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key');
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    vi.stubGlobal('window', {
      location: new URL('https://gelato.education/courses/vibecoding'),
      sessionStorage: storage,
    });
    vi.stubGlobal('sessionStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('замороженный фикстурный снимок совпадает по sha256 и коммиту', () => {
    expect(fixture.commit).toBe('0833286828ed1c3e8a5b3385817ea5cca2ce5e21');
    const computedTrackSha = createHash('sha256').update(fixture.trackClientCode).digest('hex');
    expect(computedTrackSha).toBe(fixture.trackClientSha256);
  });

  it.each(fixture.botUserAgents)('буквально распознаёт бота/краулера: %s', (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it.each(fixture.humanUserAgents)('не считает обычного пользователя ботом: %s', (ua) => {
    expect(isBot(ua)).toBe(false);
  });

  it('определяет автоматизацию при navigator.webdriver === true', () => {
    vi.stubGlobal('navigator', { webdriver: true, userAgent: fixture.humanUserAgents[0] });
    expect(isBot()).toBe(true);
  });

  it('старая версия отправляет показы и события для бота (OLD_FAILS=1), новая — отфильтровывает', async () => {
    const botUa = fixture.botUserAgents[0]; // GPTBot
    vi.stubGlobal('navigator', { webdriver: false, userAgent: botUa });

    // 1. Старая версия (до фильтрации) исполняется на замороженной фикстуре
    const oldMock = mockSdk();
    const oldJs = ts.transpile(fixture.trackClientCode, { module: ts.ModuleKind.CommonJS });
    const oldExports: {
      track: (event: string, props?: Record<string, unknown>) => void;
      identify: (uid: string, props?: Record<string, unknown>) => void;
    } = { track: () => {}, identify: () => {} };

    new Function('require', 'exports', oldJs)(() => ({ default: oldMock.sdk }), oldExports);
    oldExports.track(EVENTS.experimentExposed, { experiment: 'home_offer', variant: 'offer' });

    let oldFails = 0;
    try {
      // На старой версии событие отправлялось ботом, поэтому проверка отсутствия событий падает
      expect(oldMock.calls).toEqual([]);
    } catch {
      oldFails++;
    }
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(1);

    // 2. Новая версия: бот не отправляет показы тестов и воронку в PostHog
    const newMock = mockSdk();
    vi.doMock('@/lib/analytics/posthog', () => ({ default: newMock.sdk }));
    const { track, identify } = await import('@/lib/analytics/track-client');

    track(EVENTS.experimentExposed, { experiment: 'home_offer', variant: 'offer' });
    track(EVENTS.homeViewed, { variant: 'control' });
    identify('bot-visitor-1');

    // На новой версии ни одного вызова capture/identify не прошло
    expect(newMock.calls).toEqual([]);

    // 3. Для реального пользователя события штатно отправляются
    const humanUa = fixture.humanUserAgents[0];
    vi.stubGlobal('navigator', { webdriver: false, userAgent: humanUa });

    track(EVENTS.experimentExposed, { experiment: 'home_offer', variant: 'offer' });
    expect(newMock.calls).toEqual([
      ['capture', EVENTS.experimentExposed, { experiment: 'home_offer', variant: 'offer' }],
    ]);
  });

  it('ExperimentExposure не регистрирует свойство и не шлёт экспозицию для ботов', async () => {
    const newMock = mockSdk();
    vi.doMock('@/lib/analytics/posthog', () => ({ default: newMock.sdk }));
    const effects: (() => void)[] = [];
    vi.doMock('react', async () => ({
      ...await vi.importActual<typeof import('react')>('react'),
      useEffect: (effect: () => void) => { effects.push(effect); },
    }));

    vi.stubGlobal('navigator', { webdriver: false, userAgent: fixture.botUserAgents[0] });
    const { ExperimentExposure } = await import('@/components/experiment-exposure');
    ExperimentExposure({ experimentKey: 'home_offer', variant: 'offer' });
    for (const effect of effects.splice(0)) effect();
    expect(newMock.calls).toEqual([]);

    // Для человека экспозиция отправляется
    vi.stubGlobal('navigator', { webdriver: false, userAgent: fixture.humanUserAgents[0] });
    ExperimentExposure({ experimentKey: 'home_offer', variant: 'offer' });
    for (const effect of effects.splice(0)) effect();
    expect(newMock.calls).toEqual([
      ['register', { '$feature/home_offer': 'offer' }],
      ['capture', EVENTS.experimentExposed, { experiment: 'home_offer', variant: 'offer' }],
    ]);
  });

  it('HomeVariantAnalytics не регистрирует home_variant и не шлёт home_view для ботов', async () => {
    const newMock = mockSdk();
    vi.doMock('@/lib/analytics/posthog', () => ({ default: newMock.sdk }));
    const effects: (() => void)[] = [];
    vi.doMock('react', async () => ({
      ...await vi.importActual<typeof import('react')>('react'),
      useEffect: (effect: () => void) => { effects.push(effect); },
    }));

    vi.stubGlobal('navigator', { webdriver: false, userAgent: fixture.botUserAgents[0] });
    const { HomeVariantAnalytics } = await import('@/components/home-variant-analytics');
    HomeVariantAnalytics({ variant: 'scene' });
    for (const effect of effects.splice(0)) effect();
    expect(newMock.calls).toEqual([]);

    // Для человека отправляется
    vi.stubGlobal('navigator', { webdriver: false, userAgent: fixture.humanUserAgents[0] });
    HomeVariantAnalytics({ variant: 'scene' });
    for (const effect of effects.splice(0)) effect();
    expect(newMock.calls).toEqual([
      ['register', { home_variant: 'scene' }],
      ['capture', EVENTS.homeViewed, { variant: 'scene' }],
    ]);
  });
});
