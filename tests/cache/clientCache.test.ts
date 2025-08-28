import { clientCacheStore } from '@/cache/clientCacheStore';
import { nexusCache } from '@/cache/nexusCache';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('clientCache (nexusCache + handler)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws on non-GET definitions and warns', () => {
    const logger = require('@/utils/logger').logger;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const def = {
      method: 'POST' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/x',
    };

    expect(() => nexusCache(def as any)).toThrow('only supports GET');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('provides handler to get/set/remove/invalidate/isStale/subscribe', () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/cache',
      client: { revalidate: 60, tags: ['k'] },
    };
    const cacheKey = generateCacheKeyFromDefinition(def as any);

    clientCacheStore.set(cacheKey, {
      data: { count: 1 },
      clientRevalidate: 60,
      clientTags: ['k'],
      serverTags: [],
      source: 'manual',
    });

    const cache = nexusCache<typeof initialData>(def as any);
    const initialData = { count: 1 };

    expect(cache.get()).toEqual(initialData);

    const cb = jest.fn();
    const unsubscribe = cache.subscribe(cb);

    cache.set(old => ({ count: (old?.count ?? 0) + 1 }));
    expect(clientCacheStore.get<any>(cacheKey)?.data).toEqual({ count: 2 });
    expect(clientCacheStore.get<any>(cacheKey)?.source).toBe('manual');
    expect(cb).toHaveBeenCalledWith({ count: 2 });

    expect(cache.isStale()).toBe(false);

    cache.invalidate();
    expect(cache.isStale()).toBe(true);

    unsubscribe();
    cache.set(() => ({ count: 3 }));
    expect(cb).toHaveBeenCalledTimes(2);

    cache.remove();
    expect(clientCacheStore.get<any>(cacheKey)).toBeNull();
  });

  it('gracefully handles set/invalidate on missing entries', () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/missing',
    };
    const cache = nexusCache(def as any);
    cache.set(() => ({ ok: true }) as any);
    cache.invalidate();
  });
});
