import { COOKIES } from '@/constants/cache';

(globalThis as any).atob = (input: string) =>
  Buffer.from(input, 'base64').toString('utf8');

describe('serverCacheStateProcessor', () => {
  it('extracts and parses client cache metadata from cookies', async () => {
    jest.resetModules();
    jest.doMock('@/utils/environmentUtils', () => ({
      isServerEnvironment: () => true,
      isDevelopment: () => false,
    }));
    jest.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) =>
          name === COOKIES.NEXUS_CLIENT_CACHE
            ? {
                value: Buffer.from(
                  JSON.stringify([
                    { ttl: 10, cacheKey: 'GET:/a|tags:t1', etag: 'W/"abc"' },
                    { ttl: 0, cacheKey: 'GET:/b' },
                  ])
                ).toString('base64'),
              }
            : undefined,
      }),
    }));

    const {
      extractClientCacheMetadataFromCookies,
      findExactClientCacheMetadata,
      hasClientCacheEntryByCacheKey,
    } = require('@/cache/serverCacheStateProcessor');

    const out = await extractClientCacheMetadataFromCookies();
    expect(out).toBeTruthy();
    const found = findExactClientCacheMetadata(out!, 'GET:/a|tags:t1');
    expect(found).toEqual({
      ttl: 10,
      cacheKey: 'GET:/a|tags:t1',
      etag: 'W/"abc"',
    });
    expect(
      hasClientCacheEntryByCacheKey(
        { ttl: 0, cacheKey: 'GET:/b' } as any,
        'GET:/b'
      )
    ).toBe(true);
  });
  it('returns null when cookie missing (server env)', async () => {
    jest.resetModules();
    jest.doMock('@/utils/environmentUtils', () => ({
      isServerEnvironment: () => true,
      isDevelopment: () => false,
    }));
    jest.doMock('next/headers', () => ({
      cookies: async () => ({ get: () => undefined }),
    }));
    const {
      extractClientCacheMetadataFromCookies,
    } = require('@/cache/serverCacheStateProcessor');
    const meta = await extractClientCacheMetadataFromCookies();
    expect(meta).toBeNull();
  });

  it('warns and returns null on invalid base64 (server env)', async () => {
    jest.resetModules();
    jest.doMock('@/utils/environmentUtils', () => ({
      isServerEnvironment: () => true,
      isDevelopment: () => true,
    }));
    const logger = require('@/utils/logger').logger;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    jest.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) =>
          name === COOKIES.NEXUS_CLIENT_CACHE
            ? { value: '***invalid***' }
            : undefined,
      }),
    }));

    const {
      extractClientCacheMetadataFromCookies,
    } = require('@/cache/serverCacheStateProcessor');
    const meta = await extractClientCacheMetadataFromCookies();
    expect(meta).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns and returns null on invalid JSON (server env)', async () => {
    jest.resetModules();
    jest.doMock('@/utils/environmentUtils', () => ({
      isServerEnvironment: () => true,
      isDevelopment: () => true,
    }));
    const logger = require('@/utils/logger').logger;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    jest.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) =>
          name === COOKIES.NEXUS_CLIENT_CACHE
            ? { value: Buffer.from('{oops}', 'utf8').toString('base64') }
            : undefined,
      }),
    }));

    const {
      extractClientCacheMetadataFromCookies,
    } = require('@/cache/serverCacheStateProcessor');
    const meta = await extractClientCacheMetadataFromCookies();
    expect(meta).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
