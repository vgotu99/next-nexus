import { http, HttpResponse } from 'msw';

import { HEADERS } from '@/constants/cache';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

import { server } from '../setup';

const encodeClientCacheMetadata = (
  arr: Array<{ ttl: number; cacheKey: string; etag?: string }>
) => Buffer.from(JSON.stringify(arr)).toString('base64');

const makeDef = (overrides: Partial<any> = {}) => ({
  method: 'GET' as const,
  baseURL: 'http://localhost',
  endpoint: '/api/ssr',
  interceptors: [],
  server: { revalidate: 60, tags: ['s1'] },
  client: { revalidate: 10, tags: ['c1'], cachedHeaders: ['etag'] },
  ...overrides,
});

describe('nexus - server-side hydration and delegation', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('delegates when client cache metadata is fresh and render delegation enabled', async () => {
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
          trackRequestStart: jest.fn(() => 0),
          trackRequestSuccess: jest.fn(),
          trackRequestError: jest.fn(),
          trackRequestTimeout: jest.fn(),
        }));
        jest.doMock('@/scope/renderRegistry', () => ({
          isDelegationEnabled: () => true,
        }));

        const def = makeDef();
        const cacheKey = generateCacheKeyFromDefinition(def as any);
        jest.doMock('next/headers', () => ({
          headers: async () =>
            new Headers({
              [HEADERS.CLIENT_CACHE]: encodeClientCacheMetadata([
                { ttl: 30, cacheKey, etag: 'W/"xyz"' },
              ]),
            }),
        }));

        const { nexus } = require('@/core/client');

        await expect(nexus({ ...(def as any) })).rejects.toBeInstanceOf(
          Promise
        );

        expect(trackCacheMock).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'DELEGATE',
            key: expect.stringContaining('GET:'),
          })
        );
        resolve();
      });
    });
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

        const def = makeDef();
        const cacheKey = generateCacheKeyFromDefinition(def as any);
        jest.doMock('next/headers', () => ({
          headers: async () =>
            new Headers({
              [HEADERS.CLIENT_CACHE]: encodeClientCacheMetadata([
                { ttl: 0, cacheKey, etag: 'W/"abc"' },
              ]),
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

        const setMock = jest.fn();
        jest.doMock('@/scope/requestScopeStore', () => {
          const map = new Map<string, any>();
          return {
            requestScopeStore: {
              get: async (k: string) => map.get(k) ?? null,
              set: async (k: string, v: any) => {
                setMock(k, v);
                map.set(k, v);
              },
              clear: async () => map.clear(),
              keys: async () => Array.from(map.keys()),
              runWith: async (cb: any) => cb(),
            },
          };
        });

        const { nexus } = require('@/core/client');
        const { requestScopeStore } = require('@/scope/requestScopeStore');

        const res = await requestScopeStore.runWith(async () => {
          return await nexus({ ...(def as any) });
        });

        expect(res.ok).toBe(true);
        expect(trackCacheMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'HIT' })
        );

        expect(setMock).toHaveBeenCalledWith(
          cacheKey,
          expect.objectContaining({ data: { ok: true, path: '/api/ssr' } })
        );
        resolve();
      });
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

        const def = makeDef();
        const cacheKey = generateCacheKeyFromDefinition(def as any);

        const data = { ok: true, path: '/api/ssr' };
        const { generateETag } = require('@/utils/cacheUtils');
        const matchingEtag = generateETag(data);

        jest.doMock('next/headers', () => ({
          headers: async () =>
            new Headers({
              [HEADERS.CLIENT_CACHE]: encodeClientCacheMetadata([
                { ttl: 0, cacheKey, etag: matchingEtag },
              ]),
            }),
        }));

        server.use(
          http.get('http://localhost/api/ssr', () =>
            HttpResponse.json(data, {
              status: 200,
            })
          )
        );

        jest.doMock('@/scope/requestScopeStore', () => {
          const map = new Map<string, any>();
          return {
            requestScopeStore: {
              get: async (k: string) => map.get(k) ?? null,
              set: async (k: string, v: any) => {
                map.set(k, v);
              },
              clear: async () => map.clear(),
              keys: async () => Array.from(map.keys()),
              runWith: async (cb: any) => cb(),
            },
          };
        });
        const registered: string[] = [];
        jest.doMock('@/scope/notModifiedContext', () => ({
          runWithNotModifiedContext: (cb: any) => cb(),
          registerNotModifiedKey: (k: string) => {
            registered.push(k);
          },
          getNotModifiedKeys: () => registered,
        }));

        const { nexus } = require('@/core/client');
        const { requestScopeStore } = require('@/scope/requestScopeStore');
        const {
          runWithNotModifiedContext,
          getNotModifiedKeys,
        } = require('@/scope/notModifiedContext');

        await requestScopeStore.runWith(async () => {
          await runWithNotModifiedContext(async () => {
            await nexus({ ...(def as any) });
            const notModified = getNotModifiedKeys();
            expect(notModified).toContain(cacheKey);
          });
        });

        expect(trackCacheMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'MATCH' })
        );

        resolve();
      });
    });
  });
});
