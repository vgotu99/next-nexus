import {
  extractClientCacheMetadataFromHeaders,
  findExactClientCacheMetadata,
  hasClientCacheEntryByCacheKey,
} from '@/cache/serverCacheStateProcessor';
import { HEADERS } from '@/constants/cache';

(globalThis as any).atob = (input: string) =>
  Buffer.from(input, 'base64').toString('utf8');

describe('serverCacheStateProcessor', () => {
  it('extracts and parses client cache metadata from headers', () => {
    const metadata = [
      { ttl: 10, cacheKey: 'GET:/a|tags:t1', etag: 'W/"abc"' },
      { ttl: 0, cacheKey: 'GET:/b', etag: undefined },
    ];

    const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
    const headers = new Headers({ [HEADERS.CLIENT_CACHE]: encoded });

    const out = extractClientCacheMetadataFromHeaders(headers);
    expect(out).toEqual(metadata);

    const found = findExactClientCacheMetadata(out!, 'GET:/a|tags:t1');
    expect(found).toEqual(metadata[0]);

    expect(hasClientCacheEntryByCacheKey(metadata[1], 'GET:/b')).toBe(true);
  });

  it('returns null when header missing (server env)', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isDevelopment: () => false,
        }));
        const { extractClientCacheMetadataFromHeaders } = require('@/cache/serverCacheStateProcessor');
        const meta = extractClientCacheMetadataFromHeaders(new Headers());
        expect(meta).toBeNull();
        resolve();
      });
    });
  });

  it('warns and returns null on invalid base64 (server env)', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isDevelopment: () => true,
        }));
        const logger = require('@/utils/logger').logger;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

        const { extractClientCacheMetadataFromHeaders } = require('@/cache/serverCacheStateProcessor');
        const h = new Headers({ [HEADERS.CLIENT_CACHE]: '***invalid***' });
        const meta = extractClientCacheMetadataFromHeaders(h);
        expect(meta).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        resolve();
      });
    });
  });

  it('warns and returns null on invalid JSON (server env)', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isDevelopment: () => true,
        }));
        const logger = require('@/utils/logger').logger;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

        const { extractClientCacheMetadataFromHeaders } = require('@/cache/serverCacheStateProcessor');
        const badJson = Buffer.from('{oops}', 'utf8').toString('base64');
        const h = new Headers({ [HEADERS.CLIENT_CACHE]: badJson });
        const meta = extractClientCacheMetadataFromHeaders(h);
        expect(meta).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        resolve();
      });
    });
  });

  it('returns parsed metadata on valid header (server env)', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isDevelopment: () => false,
        }));
        const { extractClientCacheMetadataFromHeaders } = require('@/cache/serverCacheStateProcessor');
        const payload = [{ ttl: 10, cacheKey: 'K', etag: 'W/"x"' }];
        const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
        const h = new Headers({ [HEADERS.CLIENT_CACHE]: encoded });
        const meta = extractClientCacheMetadataFromHeaders(h);
        expect(meta).toEqual(payload);
        resolve();
      });
    });
  });
});
