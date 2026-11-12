import { afterEach, expect, it, vi } from 'vitest';
import { createWorkStore } from 'next/dist/server/async-storage/work-store';
import { workAsyncStorage, type WorkStore } from 'next/dist/server/app-render/work-async-storage.external';
import { workUnitAsyncStorage, type PrerenderStoreLegacy } from 'next/dist/server/app-render/work-unit-async-storage.external';
import { getApps } from 'firebase-admin/app';
import GelateriaPage from '@/app/gelateria/page';

vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks');
  vi.stubGlobal('AsyncLocalStorage', AsyncLocalStorage);
});
vi.mock('server-only', () => ({}));
vi.mock('@/components/scene/gelateria-scene', () => ({ GelateriaScene: () => null }));
vi.mock('@/components/home-variant-analytics', () => ({ HomeVariantAnalytics: () => null }));
vi.mock('@/components/experiment-exposure', () => ({ ExperimentExposure: () => null }));

afterEach(() => vi.unstubAllEnvs());

it('прерывает пререндер /gelateria до обращения к Firebase без ключа, как в CI', async () => {
  vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_BASE64', undefined);
  vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATOR', undefined);
  expect(getApps()).toHaveLength(0);

  // Настоящие cookies(), unstable_cache, каталог и Firebase Admin. Подменяем
  // только хранилище кэша: на чистой CI-сборке записи каталога ещё нет.
  const emptyCache = {
    generateCacheKey: async (key: string) => key,
    get: vi.fn(async () => null),
    set: vi.fn(),
  };
  const workStore = createWorkStore({
    page: '/gelateria/page',
    buildId: 'prerender-regression',
    deploymentId: '',
    previouslyRevalidatedTags: [],
    renderOpts: {
      supportsDynamicResponse: false,
      isBuildTimePrerendering: true,
      cacheComponents: false,
      experimental: { authInterrupts: false },
      waitUntil: undefined,
      onClose: () => {},
      onAfterTaskError: undefined,
      incrementalCache: emptyCache as unknown as WorkStore['incrementalCache'],
    },
  });
  const prerenderStore: PrerenderStoreLegacy = {
    type: 'prerender-legacy',
    phase: 'render',
    implicitTags: { tags: [], expirationsByCacheKind: new Map() },
    rootParams: {},
    revalidate: Infinity,
    expire: Infinity,
    stale: Infinity,
    tags: null,
  };

  // Вызываем async-функцию страницы в контексте статической генерации Next,
  // а не пытаемся рендерить async RSC через синхронный React-рендерер.
  const render = workAsyncStorage.run(workStore, () =>
    workUnitAsyncStorage.run(prerenderStore, () =>
      GelateriaPage({ searchParams: Promise.resolve({}) })),
  );
  await expect(render).rejects.toMatchObject({ digest: 'DYNAMIC_SERVER_USAGE' });
  expect(prerenderStore.revalidate).toBe(0);
  expect(emptyCache.get).not.toHaveBeenCalled();
  expect(getApps()).toHaveLength(0);
});
