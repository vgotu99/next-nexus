import { http, HttpResponse } from 'msw';

import { COOKIES } from '@/constants/cache';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

import { server } from '../setup';

describe('nexus - server-side hydration paths', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('hydrates when stale metadata and ETag does not match; tracks server cache HIT', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isClientEnvironment: () => false,
          isDevelopment: () => false,
        }));
        const trackCacheMock = jest.fn();
        jest.doMock('@/debug/tracker', () => ({
          trackCache: trackCacheMock,
          trackRequestStart: jest.fn(() => performance.now()),
          trackRequestSuccess: jest.fn(),
          trackRequestError: jest.fn(),
          trackRequestTimeout: jest.fn(),
        }));

        const { nexus } = require('@/core/nexus');
        const { requestScopeStore } = require('@/scope/requestScopeStore');
        const def = {
          method: 'GET' as const,
          baseURL: 'http://localhost',
          endpoint: '/api/ssr',
          interceptors: [],
          server: { revalidate: 60, tags: ['s1'] },
          client: { revalidate: 10, tags: ['c1'], cachedHeaders: ['etag'] },
        };
        const cacheKey = generateCacheKeyFromDefinition(def as any);

        jest.doMock('next/headers', () => ({
          cookies: async () => ({
            get: (name: string) =>
              name === COOKIES.NEXUS_CLIENT_CACHE
                ? {
                    value: Buffer.from(
                      JSON.stringify([{ ttl: 0, cacheKey, etag: 'W/"abc"' }])
                    ).toString('base64'),
                  }
                : undefined,
          }),
        }));

        server.use(
          http.get('http://localhost/api/ssr', () =>
            HttpResponse.json(
              { ok: true, path: '/api/ssr' },
              {
                status: 200,
                headers: {
                  etag: 'W/"def"',
                  'x-nextjs-cache': 'HIT',
                  age: '10',
                },
              }
            )
          )
        );

        requestScopeStore.enter();
        const res = await nexus({ ...(def as any) });

        expect(res.ok).toBe(true);
        expect(trackCacheMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'HIT' })
        );
      });
      resolve();
    });
  });

  it('skips hydration when stale metadata and ETag matches; registers not-modified key and tracks MATCH', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isClientEnvironment: () => false,
          isDevelopment: () => false,
        }));
        const trackCacheMock = jest.fn();
        jest.doMock('@/debug/tracker', () => ({
          trackCache: trackCacheMock,
          trackRequestStart: jest.fn(() => performance.now()),
          trackRequestSuccess: jest.fn(),
          trackRequestError: jest.fn(),
          trackRequestTimeout: jest.fn(),
        }));

        const { nexus } = require('@/core/nexus');
        const { requestScopeStore } = require('@/scope/requestScopeStore');
        const {
          registerNotModifiedKey,
          getNotModifiedKeys,
          enterNotModifiedContext,
        } = require('@/scope/notModifiedContext');

        const def = {
          method: 'GET' as const,
          baseURL: 'http://localhost',
          endpoint: '/api/ssr',
          interceptors: [],
          server: { revalidate: 60, tags: ['s1'] },
          client: { revalidate: 10, tags: ['c1'], cachedHeaders: ['etag'] },
        };
        const cacheKey = generateCacheKeyFromDefinition(def as any);
        const data = { ok: true, path: '/api/ssr' };
        const { generateETag } = require('@/utils/cacheUtils');
        const matchingEtag = generateETag(data);

        jest.doMock('next/headers', () => ({
          cookies: async () => ({
            get: (name: string) =>
              name === COOKIES.NEXUS_CLIENT_CACHE
                ? {
                    value: Buffer.from(
                      JSON.stringify([{ ttl: 0, cacheKey, etag: matchingEtag }])
                    ).toString('base64'),
                  }
                : undefined,
          }),
        }));

        server.use(
          http.get('http://localhost/api/ssr', () => HttpResponse.json(data))
        );

        requestScopeStore.enter();
        enterNotModifiedContext();
        await nexus({ ...(def as any) });
        registerNotModifiedKey(cacheKey);
        const keys = getNotModifiedKeys();
        expect(keys).toContain(cacheKey);
        expect(trackCacheMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'MATCH' })
        );
      });
      resolve();
    });
  });
});
