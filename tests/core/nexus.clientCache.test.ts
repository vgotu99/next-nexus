import { clientCacheStore } from '@/cache/clientCacheStore';
import { nexus } from '@/core/client';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('nexus - client cache hit', () => {
  it('returns CLIENT_HIT response from client cache and supports clone()', async () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/hello',
      interceptors: [],
      client: { revalidate: 60, tags: ['t1'] },
    };

    const cacheKey = generateCacheKeyFromDefinition(def);

    clientCacheStore.set(cacheKey, {
      data: { ok: true, path: '/api/hello' },
      clientRevalidate: 60,
      clientTags: ['t1'],
      serverTags: [],
      etag: undefined,
      headers: undefined,
      source: 'manual',
    });

    const res = await nexus<
      typeof def extends { _phantomResponse: infer R }
        ? R
        : { ok: boolean; path: string }
    >(def as any);

    expect(res.headers.get('x-nexus-cache-status')).toBe('CLIENT_HIT');
    expect(res.data).toEqual({ ok: true, path: '/api/hello' });

    const cloned = res.clone();
    expect(cloned.data).toEqual({ ok: true, path: '/api/hello' });
  });
});
