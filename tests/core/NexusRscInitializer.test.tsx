import { render } from '@testing-library/react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { COOKIES } from '@/constants/cache';
import { NexusRscInitializer } from '@/core/NexusRscInitializer';

(globalThis as any).btoa = (s: string) =>
  Buffer.from(s, 'binary').toString('base64');

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('NexusRscInitializer', () => {
  beforeEach(() => {
    (globalThis as any).fetch = async () => new Response('{}');
    Object.defineProperty(document, 'cookie', {
      value: '',
      writable: true,
    });
  });

  it('wraps fetch and writes pathname + client cache cookies for RSC request', async () => {
    const key = 'GET:http://example.com/api?a=1';
    clientCacheStore.set(key, {
      data: { ok: true },
      clientRevalidate: 30,
      clientTags: ['x'],
      serverTags: [],
      etag: 'W/"etag"',
      headers: { etag: 'W/"etag"' },
      source: 'manual',
    });
    clientCacheStore.indexPathname('/api', key);

    render(<NexusRscInitializer />);

    await fetch('http://example.com/api', {
      method: 'GET',
      headers: new Headers({ Accept: 'text/x-component' }),
    } as any);

    expect(document.cookie).toContain(`${COOKIES.NEXUS_CLIENT_CACHE}=`);
  });
});
