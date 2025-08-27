import {
  collectClientCacheMetadata,
  createClientCacheMetadataHeader,
} from '@/cache/clientCacheMetadataCollector';
import type { ClientCacheEntry, ClientCacheMetadata } from '@/types/cache';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('clientCacheMetadataCollector', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('collectClientCacheMetadata computes ttl and preserves cacheKey/etag', () => {
    const now = Date.now();
    const entry: ClientCacheEntry = {
      data: { ok: true },
      createdAt: now,
      expiresAt: now + 5000,
      clientRevalidate: 5,
      clientTags: ['a'],
      serverTags: ['s'],
      etag: 'W/"abc"',
      source: 'manual',
    };

    const meta = collectClientCacheMetadata('KEY', entry);
    expect(meta.cacheKey).toBe('KEY');
    expect(typeof meta.ttl).toBe('number');
    expect(meta.ttl).toBeGreaterThan(0);
    expect(meta.etag).toBe('W/"abc"');
  });

  it('createClientCacheMetadataHeader returns base64-encoded JSON when within size', () => {
    const prevBtoa = (global as any).btoa;
    (global as any).btoa = (s: string) =>
      Buffer.from(s, 'binary').toString('base64');

    const meta: ClientCacheMetadata[] = [
      { ttl: 10, cacheKey: 'K', etag: 'W/"x"' },
    ];

    const header = createClientCacheMetadataHeader(meta)!;
    expect(typeof header).toBe('string');

    const decoded = Buffer.from(header, 'base64').toString('utf8');
    expect(decoded).toBe(JSON.stringify(meta));

    (global as any).btoa = prevBtoa;
  });

  it('createClientCacheMetadataHeader truncates and warns when payload exceeds header size', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isClientEnvironment: () => true,
          isServerEnvironment: () => false,
          isDevelopment: () => true,
        }));

        const {
          createClientCacheMetadataHeader,
        } = require('@/cache/clientCacheMetadataCollector');
        const logger = require('@/utils/logger').logger;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

        const prevBtoa = (global as any).btoa;
        (global as any).btoa = (s: string) =>
          Buffer.from(s, 'binary').toString('base64');
        const huge = 'x'.repeat(8200);
        const meta: ClientCacheMetadata[] = [
          { ttl: 10, cacheKey: 'K', etag: huge },
        ];

        const header = createClientCacheMetadataHeader(meta);
        expect(header).not.toBeNull();
        const decoded = Buffer.from(header as string, 'base64').toString(
          'utf8'
        );
        expect(decoded.length).toBe(8092);
        expect(warnSpy).toHaveBeenCalled();

        warnSpy.mockRestore();
        (global as any).btoa = prevBtoa;
        resolve();
      });
    });
  });

  it('returns null and warns when serialization fails', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isClientEnvironment: () => true,
          isServerEnvironment: () => false,
          isDevelopment: () => true,
        }));
        const {
          createClientCacheMetadataHeader,
        } = require('@/cache/clientCacheMetadataCollector');
        const logger = require('@/utils/logger').logger;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

        const originalStringify = JSON.stringify;
        (JSON as any).stringify = () => {
          throw new Error('fail');
        };

        const header = createClientCacheMetadataHeader([
          { ttl: 1, cacheKey: 'a' } as any,
        ]);
        expect(header).toBeNull();
        expect(warnSpy).toHaveBeenCalled();

        (JSON as any).stringify = originalStringify;
        warnSpy.mockRestore();
        resolve();
      });
    });
  });

  it('returns null and warns when btoa is unavailable', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isClientEnvironment: () => true,
          isServerEnvironment: () => false,
          isDevelopment: () => true,
        }));
        const {
          createClientCacheMetadataHeader,
        } = require('@/cache/clientCacheMetadataCollector');
        const logger = require('@/utils/logger').logger;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

        const prevBtoa = (global as any).btoa;
        delete (global as any).btoa;

        const header = createClientCacheMetadataHeader([
          { ttl: 1, cacheKey: 'a' } as any,
        ]);
        expect(header).toBeNull();
        expect(warnSpy).toHaveBeenCalled();

        (global as any).btoa = prevBtoa;
        warnSpy.mockRestore();
        resolve();
      });
    });
  });

  it('does not truncate when serialized payload length <= MAX_HEADER_SIZE', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isClientEnvironment: () => true,
          isServerEnvironment: () => false,
          isDevelopment: () => true,
        }));
        const {
          createClientCacheMetadataHeader,
        } = require('@/cache/clientCacheMetadataCollector');
        const logger = require('@/utils/logger').logger;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

        const prevBtoa = (global as any).btoa;
        (global as any).btoa = (s: string) =>
          Buffer.from(s, 'binary').toString('base64');

        const baseMeta = (etagLen: number) =>
          [
            { ttl: 10, cacheKey: 'K', etag: 'x'.repeat(etagLen) },
          ] as ClientCacheMetadata[];
        const serializedLen = (etagLen: number) =>
          JSON.stringify(baseMeta(etagLen)).length;

        let low = 0,
          high = 9000,
          best = 0;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const len = serializedLen(mid);
          if (len <= 8192) {
            best = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        const meta = baseMeta(best);
        const header = createClientCacheMetadataHeader(meta)!;
        const decoded = Buffer.from(header, 'base64').toString('utf8');
        expect(decoded).toBe(JSON.stringify(meta));
        expect(warnSpy).not.toHaveBeenCalled();

        (global as any).btoa = prevBtoa;
        warnSpy.mockRestore();
        resolve();
      });
    });
  });
});
