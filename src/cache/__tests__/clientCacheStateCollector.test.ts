import {
  collectValidCacheMetadata,
  serializeCacheState,
  encodeForHeader,
  createCacheStateHeader,
  hasValidCacheEntriesByCacheKeys,
} from '@/cache/clientCacheStateCollector';
import { clientCacheStore } from '@/cache/clientCacheStore';
import { isCacheEntryExpired } from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';

jest.mock('@/cache/clientCacheStore');
jest.mock('@/utils/environmentUtils');
jest.mock('@/utils/cacheUtils');

const mockClientCache = clientCacheStore as jest.Mocked<
  typeof clientCacheStore
>;
const mockIsClientEnvironment = isClientEnvironment as jest.MockedFunction<
  typeof isClientEnvironment
>;
const mockIsCacheEntryExpired = isCacheEntryExpired as jest.MockedFunction<
  typeof isCacheEntryExpired
>;

describe('clientCacheStateCollector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsClientEnvironment.mockReturnValue(true);
    mockIsCacheEntryExpired.mockReturnValue(false);
  });

  describe('collectValidCacheMetadata', () => {
    it('should return empty array when not in client environment', async () => {
      mockIsClientEnvironment.mockReturnValue(false);

      const result = collectValidCacheMetadata();

      expect(result).toEqual([]);
    });

    it('should collect valid cache metadata', async () => {
      const mockKeys = ['key1', 'key2'];
      const mockEntry1 = {
        key: 'key1',
        data: 'test-data',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        clientTags: ['tag1'],
        serverTags: ['tag2'],
        etag: 'etag1',
        source: 'fetch' as const,
        lastAccessed: Date.now(),
      };
      const mockEntry2 = {
        key: 'key2',
        data: 'test-data-2',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        clientTags: [],
        serverTags: undefined,
        etag: undefined,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
      };

      mockClientCache.keys.mockReturnValue(mockKeys);
      mockClientCache.get
        .mockReturnValueOnce(mockEntry1)
        .mockReturnValueOnce(mockEntry2);

      const result = collectValidCacheMetadata();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'key1',
        expiresAt: mockEntry1.expiresAt,
        clientTags: ['tag1'],
        serverTags: ['tag2'],
        etag: 'etag1',
      });
      expect(result[1]).toEqual({
        key: 'key2',
        expiresAt: mockEntry2.expiresAt,
        clientTags: undefined,
        serverTags: undefined,
        etag: undefined,
      });
    });

    it('should filter out expired entries', async () => {
      const mockKeys = ['key1', 'key2'];
      const mockEntry1 = {
        key: 'key1',
        data: 'test-data',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
      };
      const mockEntry2 = {
        key: 'key2',
        data: 'test-data-2',
        createdAt: Date.now(),
        expiresAt: Date.now() - 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
      };

      mockClientCache.keys.mockReturnValue(mockKeys);
      mockClientCache.get
        .mockReturnValueOnce(mockEntry1)
        .mockReturnValueOnce(mockEntry2);
      mockIsCacheEntryExpired
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = collectValidCacheMetadata();

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('key1');
    });
  });

  describe('serializeCacheState', () => {
    it('should serialize metadata with timestamp', () => {
      const metadata = [{ key: 'test', expiresAt: 123456 }];

      const result = serializeCacheState(metadata);
      const parsed = JSON.parse(result);

      expect(parsed.metadata).toEqual(metadata);
      expect(typeof parsed.timestamp).toBe('number');
    });
  });

  describe('encodeForHeader', () => {
    it('should encode data using base64', () => {
      const data = 'test data';

      const result = encodeForHeader(data);

      expect(result).toBe(btoa(data));
    });

    it('should truncate data exceeding header size limit', () => {
      const largeData = 'x'.repeat(10000);

      const result = encodeForHeader(largeData);

      expect(result.length).toBeLessThan(btoa(largeData).length);
    });
  });

  describe('createCacheStateHeader', () => {
    it('should return null when no valid cache metadata', async () => {
      mockClientCache.keys.mockReturnValue([]);

      const result = createCacheStateHeader();

      expect(result).toBeNull();
    });

    it('should create encoded header when valid metadata exists', async () => {
      const mockKeys = ['key1'];
      const mockEntry = {
        key: 'key1',
        data: 'test-data',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
      };

      mockClientCache.keys.mockReturnValue(mockKeys);
      mockClientCache.get.mockReturnValue(mockEntry);

      const result = createCacheStateHeader();

      expect(typeof result).toBe('string');
      expect(result!.length).toBeGreaterThan(0);
    });
  });

  describe('hasValidCacheEntries', () => {
    it('should return false array when not in client environment', async () => {
      mockIsClientEnvironment.mockReturnValue(false);

      const result = hasValidCacheEntriesByCacheKeys(['key1', 'key2']);

      expect(result).toEqual([false, false]);
    });

    it('should check cache entry validity', async () => {
      const keys = ['key1', 'key2'];
      mockClientCache.get
        .mockReturnValueOnce({
          key: 'key1',
          data: 'test-data',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          source: 'fetch' as const,
          lastAccessed: Date.now(),
        })
        .mockReturnValueOnce(null);
      mockIsCacheEntryExpired.mockReturnValue(false);

      const result = hasValidCacheEntriesByCacheKeys(keys);

      expect(result).toEqual([true, false]);
    });
  });
});
