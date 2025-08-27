/**
 * @jest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import ClientNexusProvider, {
  initNexusClient,
} from '@/providers/ClientNexusProvider';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => true,
}));

const extender = require('@/cache/clientCacheExtender');

describe('ClientNexusProvider and initNexusClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initNexusClient hydrates cache, extends TTL for not-modified keys, and cleans resources', () => {
    const extendSpy = jest.spyOn(extender, 'extendCacheEntryTTL');

    const key = 'GET:http://localhost/api/hydration|c:tag|s:';

    (window as any).__NEXUS_PAYLOAD__ = {
      hydrationData: {
        [key]: {
          data: { hello: 'world' },
          clientRevalidate: 30,
          clientTags: ['tag'],
          serverTags: [],
          etag: 'W/"abc"',
          headers: { etag: 'W/"abc"' },
        },
      },
      notModifiedKeys: [key],
    };

    const script = document.createElement('script');
    script.id = '__NEXUS_SCRIPT__';
    document.body.appendChild(script);

    expect(clientCacheStore.size()).toBe(0);

    initNexusClient();

    expect(clientCacheStore.size()).toBe(1);
    const entry = clientCacheStore.get<any>(key);
    expect(entry?.data).toEqual({ hello: 'world' });
    expect(entry?.source).toBe('hydration');
    expect(entry?.etag).toBe('W/"abc"');

    expect(extendSpy).toHaveBeenCalledWith(key, 30);

    expect((window as any).__NEXUS_PAYLOAD__).toBeUndefined();
    expect(document.getElementById('__NEXUS_SCRIPT__')).toBeNull();
  });

  it('ClientNexusProvider applies maxSize on mount', async () => {
    const spy = jest.spyOn(clientCacheStore, 'setMaxSize');

    const { getByText } = render(
      <ClientNexusProvider maxSize={5}>
        <div>child</div>
      </ClientNexusProvider>
    );

    getByText('child');

    await waitFor(() => expect(spy).toHaveBeenCalledWith(5));
  });
});
