import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import {
  collectExpiredCacheETags,
  createIfNoneMatchHeader,
  serializeETagsForHeader,
} from '@/cache/expiredCacheETagCollector';
import {
  parseIfNoneMatchHeader,
  validateETag,
  createNotModifiedResponse,
  performETagValidation,
} from '@/cache/serverETagValidator';
import { generateETag } from '@/utils/cacheUtils';
import {
  isClientEnvironment,
  isServerEnvironment,
} from '@/utils/environmentUtils';

jest.mock('@/cache/clientCacheStore');
jest.mock('@/utils/environmentUtils');

const mockClientCache = clientCacheStore as jest.Mocked<
  typeof clientCacheStore
>;
const mockIsClientEnvironment = isClientEnvironment as jest.MockedFunction<
  typeof isClientEnvironment
>;
const mockIsServerEnvironment = isServerEnvironment as jest.MockedFunction<
  typeof isServerEnvironment
>;

describe('ETag Revalidation System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsClientEnvironment.mockReturnValue(true);
  });

  describe('Expired Cache ETag Collection', () => {
    it('should collect ETags from expired cache entries', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      const mockExpiredEntry = {
        key: 'key1',
        data: 'test-data',
        etag: 'W/"abc123"',
        expiresAt: Date.now() - 60000,
        clientRevalidate: 300,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
      };
      const mockValidEntry = {
        key: 'key2',
        data: 'test-data-2',
        etag: 'W/"def456"',
        expiresAt: Date.now() + 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
      };

      mockClientCache.keys.mockReturnValue(mockKeys);
      mockClientCache.get
        .mockReturnValueOnce(mockExpiredEntry)
        .mockReturnValueOnce(mockValidEntry)
        .mockReturnValueOnce(null);

      const result = collectExpiredCacheETags();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        cacheKey: 'key1',
        etag: 'W/"abc123"',
        originalTTL: 300,
      });
    });

    it('should create If-None-Match header from expired ETags', async () => {
      const etags = ['W/"etag1"', 'W/"etag2"', 'W/"etag3"'];

      const result = serializeETagsForHeader(etags);

      expect(result).toBe('W/"etag1", W/"etag2", W/"etag3"');
    });

    it('should handle empty ETag list', async () => {
      mockClientCache.keys.mockReturnValue([]);

      const result = createIfNoneMatchHeader();

      expect(result).toBeNull();
    });
  });

  describe('Server ETag Validation', () => {
    it('should parse If-None-Match header correctly', () => {
      const headerValue = 'W/"etag1", W/"etag2", W/"etag3"';

      const result = parseIfNoneMatchHeader(headerValue);

      expect(result).toEqual(['W/"etag1"', 'W/"etag2"', 'W/"etag3"']);
    });

    it('should validate ETag match correctly', () => {
      const testData = { name: 'test', value: 123 };
      const dataETag = generateETag(testData);
      const clientETags = [dataETag, 'W/"other"'];

      const result = validateETag(testData, clientETags);

      expect(result.shouldUseCache).toBe(true);
      expect(result.dataETag).toBe(dataETag);
      expect(result.clientETags).toEqual(clientETags);
    });

    it('should validate ETag mismatch correctly', () => {
      const testData = { name: 'test', value: 123 };
      const dataETag = generateETag(testData);
      const clientETags = ['W/"different1"', 'W/"different2"'];

      const result = validateETag(testData, clientETags);

      expect(result.shouldUseCache).toBe(false);
      expect(result.dataETag).toBe(dataETag);
    });

    it('should create 304 Not Modified response', () => {
      const url = '/api/test';
      const etag = 'W/"abc123"';
      const revalidationSignal = 'extend-ttl=300';

      const response = createNotModifiedResponse(url, etag, revalidationSignal);

      expect(response.status).toBe(304);
      expect(response.statusText).toBe('Not Modified');
      expect(response.headers.get('etag')).toBe(etag);
      expect(response.headers.get('x-next-fetch-cache-revalidation')).toBe(
        revalidationSignal
      );
    });
  });

  describe('Client Cache Lifecycle Extension', () => {
    it('should extend cache lifecycle for an existing entry', () => {
      const mockEntry = {
        key: 'test-key',
        data: 'test-data',
        expiresAt: Date.now() - 60000,
        lastAccessed: Date.now() - 120000,
        source: 'fetch' as const,
        createdAt: Date.now(),
      };

      mockClientCache.get.mockReturnValue(mockEntry);
      mockClientCache.set.mockReturnValue();

      const result = extendCacheEntryTTL('test-key', 300);

      expect(result).toBe(true);
      expect(mockClientCache.get).toHaveBeenCalledWith('test-key');
      expect(mockClientCache.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          expiresAt: expect.any(Number),
          lastAccessed: expect.any(Number),
        })
      );

      const newEntry = mockClientCache.set.mock.calls[0][1];

      expect(newEntry.expiresAt).toBeGreaterThan(Date.now() + 299 * 1000);
    });

    it('should return false if cache entry does not exist', () => {
      mockClientCache.get.mockReturnValue(null);

      const result = extendCacheEntryTTL('non-existent-key', 300);

      expect(result).toBe(false);
      expect(mockClientCache.get).toHaveBeenCalledWith('non-existent-key');
      expect(mockClientCache.set).not.toHaveBeenCalled();
    });
  });

  describe('End-to-End ETag Revalidation Flow', () => {
    it('should complete full ETag revalidation cycle', async () => {
      const testData = { id: 1, name: 'test' };
      const dataETag = generateETag(testData);

      const expiredEntry = {
        key: 'api-key',
        data: testData,
        etag: dataETag,
        expiresAt: Date.now() - 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
      };

      mockClientCache.keys.mockReturnValue(['api-key']);
      mockClientCache.get.mockReturnValue(expiredEntry);

      const ifNoneMatchHeader = createIfNoneMatchHeader();
      expect(ifNoneMatchHeader).toBe(dataETag);

      mockIsServerEnvironment.mockReturnValue(true);

      const currentData = testData;
      const headers = new Headers({
        'if-none-match': ifNoneMatchHeader!,
      });

      const validation = performETagValidation(headers, currentData);
      expect(validation.shouldUseCache).toBe(true);

      const extensionResult = extendCacheEntryTTL('api-key', 300);

      expect(extensionResult).toBe(true);
      expect(mockClientCache.set).toHaveBeenCalledWith(
        'api-key',
        expect.objectContaining({ etag: dataETag })
      );
    });

    it('should handle data change scenario', async () => {
      const oldData = { id: 1, name: 'old' };
      const newData = { id: 1, name: 'new' };

      const oldETag = generateETag(oldData);
      const newETag = generateETag(newData);

      expect(oldETag).not.toBe(newETag);

      const validation = validateETag(newData, [oldETag]);
      expect(validation.shouldUseCache).toBe(false);
      expect(validation.dataETag).toBe(newETag);
    });
  });
});
