import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('extendCacheEntryTTL', () => {
  it('returns false when cache key is missing', () => {
    const ok = extendCacheEntryTTL('MISSING:KEY', 10);
    expect(ok).toBe(false);
  });

  it('only updates expiresAt and preserves source', () => {
    const key = 'GET:http://localhost/api/ttl|tags:a,b';

    clientCacheStore.set(key, {
      data: { v: 1 },
      clientRevalidate: 30,
      clientTags: ['a', 'b'],
      serverTags: [],
      source: 'hydration',
    });

    const before = clientCacheStore.get<any>(key)!;
    expect(before.source).toBe('hydration');

    const ok = extendCacheEntryTTL(key, 60);
    expect(ok).toBe(true);

    const after = clientCacheStore.get<any>(key)!;
    expect(after.source).toBe('hydration');
    expect(after.expiresAt).toBeGreaterThan(before.expiresAt);
  });
});
