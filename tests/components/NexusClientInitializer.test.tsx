/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import React from 'react';

import { HEADERS } from '@/constants/cache';

(globalThis as any).btoa = (s: string) => Buffer.from(s, 'binary').toString('base64');

describe('NexusClientInitializer', () => {
  it('injects client cache header for RSC requests and restores fetch on unmount', async () => {
    const calls: Array<Headers | undefined> = [];

    jest.doMock('@/cache/clientCacheStore', () => ({
      clientCacheStore: {
        getCacheKeysFromBaseKey: (_base: string) => new Set(['GET:http://example.test']),
        get: (_key: string) => ({
          data: { ok: true },
          createdAt: Date.now(),
          expiresAt: Date.now() + 10000,
          clientRevalidate: 10,
          clientTags: ['x'],
          serverTags: [],
          etag: 'W/"x"',
          headers: { etag: 'W/"x"' },
          source: 'manual',
        }),
      },
    }));

    const mod = require('@/core/NexusClientInitializer');
    const NexusClientInitializer = mod.default as React.FC<{ children: React.ReactNode }>;

    window.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init?.headers instanceof Headers ? init.headers : undefined);
      return new Response('{}', { status: 200 });
    }) as any;

    const { unmount } = render(
      <NexusClientInitializer>
        <div>child</div>
      </NexusClientInitializer>
    );

    await fetch('http://example.test', {
      method: 'GET',
      headers: new Headers({ RSC: '1' }),
    });

    await fetch('http://example.test', { method: 'GET' });

    expect(calls[0]?.get(HEADERS.CLIENT_CACHE)).toBeTruthy();
    expect(calls[1]?.get(HEADERS.CLIENT_CACHE)).toBeFalsy();

    unmount();
    expect((window.fetch as any).mock).toBeDefined();
    expect('__nexusIntercepted' in (window.fetch as any)).toBe(false);
  });
});
