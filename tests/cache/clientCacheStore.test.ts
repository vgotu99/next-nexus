import { clientCacheStore } from '@/cache/clientCacheStore';
import { generateCacheKey } from '@/utils/cacheUtils';

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
    ['tA', 'tB', 'tC', 'tX', 'tY', 'tZ'].forEach(tag => {
      const keys = clientCacheStore.getKeysByTags([tag]);
      keys.forEach(key => clientCacheStore.delete(key));
    });
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

  it('indexes by tags; getKeysByTags retrieves matching entries', () => {
    clientCacheStore.set(keyA, entry({ a: 1 }, ['tX', 'tA']));
    clientCacheStore.set(keyB, entry({ b: 1 }, ['tY']));

    const keysWithTagX = clientCacheStore.getKeysByTags(['tX']);
    expect(keysWithTagX).toContain(keyA);
    expect(keysWithTagX).not.toContain(keyB);

    const keysWithTagY = clientCacheStore.getKeysByTags(['tY']);
    expect(keysWithTagY).toContain(keyB);
    expect(keysWithTagY).not.toContain(keyA);
  });

  it('subscribe notifies on set and delete and can unsubscribe', async () => {
    const received: Array<unknown> = [];
    const unsubscribe = clientCacheStore.subscribe(keyA, e =>
      received.push(e ? e.data : null)
    );

    clientCacheStore.set(keyA, entry({ a: 1 }, ['tZ']));
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
    expect(received).toEqual([{ a: 1 }]);

    clientCacheStore.delete(keyA);
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
    expect(received).toEqual([{ a: 1 }, null]);

    unsubscribe();
    clientCacheStore.set(keyA, entry({ a: 2 }, ['tZ']));
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));

    expect(received).toEqual([{ a: 1 }, null]);
  });

  it('invalidate marks entry stale and source manual when present', () => {
    clientCacheStore.set(keyA, entry({ a: 1 }, ['tA']));
    const before = clientCacheStore.get<any>(keyA)!;
    expect(before.source).toBe('manual');

    clientCacheStore.invalidate(keyA);
    const after = clientCacheStore.get<any>(keyA)!;
    expect(after.expiresAt).toBe(0);
    expect(after.source).toBe('manual');
  });
});
