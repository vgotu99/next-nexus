import { clientCacheStore } from '@/cache/clientCacheStore';
import { generateBaseKey, generateCacheKey } from '@/utils/cacheUtils';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('clientCacheStore', () => {
  const urlA = 'http://localhost/a';
  const urlB = 'http://localhost/b';
  const urlC = 'http://localhost/c';

  const keyA = generateCacheKey({
    url: urlA,
    method: 'GET',
    clientTags: ['tA'],
  });
  const keyB = generateCacheKey({
    url: urlB,
    method: 'GET',
    clientTags: ['tB'],
  });
  const keyC = generateCacheKey({
    url: urlC,
    method: 'GET',
    clientTags: ['tC'],
  });

  const entry = (data: unknown, tags: string[]) => ({
    data,
    clientRevalidate: 60,
    clientTags: tags,
    serverTags: [],
    etag: undefined,
    headers: undefined,
    source: 'manual' as const,
  });

  afterEach(() => {
    clientCacheStore.revalidateByTags(['tA', 'tB', 'tC', 'tX', 'tY', 'tZ']);
  });

  it('evicts least-recently-used when capacity exceeded', () => {
    const prev = clientCacheStore.getMaxSize();
    clientCacheStore.setMaxSize(2);

    clientCacheStore.set(keyA, entry({ a: 1 }, ['tA']));
    clientCacheStore.set(keyB, entry({ b: 1 }, ['tB']));
    clientCacheStore.set(keyC, entry({ c: 1 }, ['tC']));

    expect(clientCacheStore.get(keyA)).toBeNull();
    expect(clientCacheStore.get(keyB)?.data).toEqual({ b: 1 });
    expect(clientCacheStore.get(keyC)?.data).toEqual({ c: 1 });

    clientCacheStore.setMaxSize(prev);
  });

  it('touches entry on get so it becomes MRU and prevents eviction', () => {
    const prev = clientCacheStore.getMaxSize();
    clientCacheStore.setMaxSize(2);

    clientCacheStore.set(keyA, entry({ a: 1 }, ['tA']));
    clientCacheStore.set(keyB, entry({ b: 1 }, ['tB']));

    expect(clientCacheStore.get(keyA)?.data).toEqual({ a: 1 });

    clientCacheStore.set(keyC, entry({ c: 1 }, ['tC']));

    expect(clientCacheStore.get(keyA)?.data).toEqual({ a: 1 });
    expect(clientCacheStore.get(keyB)).toBeNull();
    expect(clientCacheStore.get(keyC)?.data).toEqual({ c: 1 });

    clientCacheStore.setMaxSize(prev);
  });

  it('indexes by tags and baseKey; revalidateByTags removes matching entries', () => {
    const baseA = generateBaseKey({ url: urlA, method: 'GET' });

    clientCacheStore.set(keyA, entry({ a: 1 }, ['tX', 'tA']));
    clientCacheStore.set(keyB, entry({ b: 1 }, ['tY']));

    const baseSet = clientCacheStore.getCacheKeysFromBaseKey(baseA);
    expect(baseSet?.has(keyA)).toBe(true);

    clientCacheStore.revalidateByTags(['tX']);
    expect(clientCacheStore.get(keyA)).toBeNull();
    expect(clientCacheStore.get(keyB)?.data).toEqual({ b: 1 });
  });

  it('subscribe notifies on set and delete and can unsubscribe', () => {
    const received: Array<unknown> = [];
    const unsubscribe = clientCacheStore.subscribe(keyA, e =>
      received.push(e ? e.data : null)
    );

    clientCacheStore.set(keyA, entry({ a: 1 }, ['tZ']));
    clientCacheStore.delete(keyA);

    unsubscribe();
    clientCacheStore.set(keyA, entry({ a: 2 }, ['tZ']));

    expect(received).toEqual([{ a: 1 }, null]);
  });
});
