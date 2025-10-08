import { render } from '@testing-library/react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { NexusHydrator } from '@/client/NexusHydrator';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => true,
}));

describe('NexusHydrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets maxSize when provided', () => {
    const spy = jest.spyOn(clientCacheStore, 'setMaxSize');
    render(<NexusHydrator maxSize={123} />);
    expect(spy).toHaveBeenCalledWith(123);
  });

  it('hydrates cache and indexes pathname, extends TTL for not-modified keys', () => {
    const key = 'GET:http://localhost/api/data|c:tag|s:';
    const pathname = '/path';

    const extendFnSpy = jest.spyOn(
      require('@/cache/clientCacheExtender'),
      'extendCacheEntryTTL'
    );

    render(<NexusHydrator />);

    const payload = {
      hydrationData: {
        [key]: {
          data: { a: 1 },
          clientRevalidate: 30,
          clientTags: ['tag'],
          serverTags: [],
          etag: 'W/"k"',
          headers: { etag: 'W/"k"' },
        },
      },
      notModifiedKeys: [key],
      pathname,
    } as const;

    window.dispatchEvent(new CustomEvent('nexus:hydrate', { detail: payload }));

    const entry = clientCacheStore.get<any>(key)!;
    expect(entry.data).toEqual({ a: 1 });
    expect(entry.source).toBe('hydration');
    expect(entry.etag).toBe('W/"k"');

    const keysByPath = clientCacheStore.getCacheKeysFromPathname(pathname);
    expect(keysByPath).toContain(key);

    expect(extendFnSpy).toHaveBeenCalledWith(key, 30);
  });
});
