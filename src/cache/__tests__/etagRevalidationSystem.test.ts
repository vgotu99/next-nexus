import { clientCache } from '@/cache/clientCache';
import {
  parseCacheRevalidationHeader,
  extendCacheLifecycle,
  handleNotModifiedResponse,
} from '@/cache/clientCacheLifecycleExtender';
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

jest.mock('@/cache/clientCache');
jest.mock('@/utils/environmentUtils');

const mockClientCache = clientCache as jest.Mocked<typeof clientCache>;
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

      mockClientCache.keys.mockResolvedValue(mockKeys);
      mockClientCache.get
        .mockResolvedValueOnce(mockExpiredEntry)
        .mockResolvedValueOnce(mockValidEntry)
        .mockResolvedValueOnce(null);

      const result = await collectExpiredCacheETags();

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
      mockClientCache.keys.mockResolvedValue([]);

      const result = await createIfNoneMatchHeader();

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
    it('should parse cache revalidation header correctly', () => {
      const headerValue = 'extend-ttl=300';

      const result = parseCacheRevalidationHeader(headerValue);

      expect(result).toBe(300);
    });

    it('should return null for invalid header format', () => {
      const result = parseCacheRevalidationHeader('invalid-format');

      expect(result).toBeNull();
    });

    it('should extend cache lifecycle for expired entry', async () => {
      const mockExpiredEntry = {
        key: 'test-key',
        data: 'test-data',
        expiresAt: Date.now() - 60000,
        lastAccessed: Date.now() - 120000,
        source: 'fetch' as const,
        createdAt: Date.now(),
      };

      mockClientCache.get.mockResolvedValue(mockExpiredEntry);
      mockClientCache.set.mockResolvedValue();

      const result = await extendCacheLifecycle({
        cacheKey: 'test-key',
        extensionTTL: 300,
        reason: 'etag-match',
      });

      expect(result).toBe(true);
      expect(mockClientCache.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          expiresAt: expect.any(Number),
          lastAccessed: expect.any(Number),
        })
      );
    });

    it('should handle 304 Not Modified response', async () => {
      const response = new Response(null, {
        status: 304,
        headers: {
          'x-next-fetch-cache-revalidation': 'extend-ttl=600',
        },
      });

      const mockEntry = {
        key: 'test-key',
        data: 'test-data',
        expiresAt: Date.now() - 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
      };

      mockClientCache.get.mockResolvedValue(mockEntry);
      mockClientCache.set.mockResolvedValue();

      const result = await handleNotModifiedResponse(response, 'test-key');

      expect(result).toBe(true);
      expect(mockClientCache.set).toHaveBeenCalled();
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

      mockClientCache.keys.mockResolvedValue(['api-key']);
      mockClientCache.get.mockResolvedValue(expiredEntry);

      const ifNoneMatchHeader = await createIfNoneMatchHeader();
      expect(ifNoneMatchHeader).toBe(dataETag);

      mockIsServerEnvironment.mockReturnValue(true);

      const currentData = testData;
      const headers = new Headers({
        'if-none-match': ifNoneMatchHeader!,
      });

      const validation = performETagValidation(headers, currentData);
      expect(validation.shouldUseCache).toBe(true);

      const notModifiedResponse = createNotModifiedResponse(
        '/api/test',
        validation.dataETag,
        'extend-ttl=300'
      );

      expect(notModifiedResponse.status).toBe(304);

      mockClientCache.set.mockResolvedValue();

      const extensionResult = await handleNotModifiedResponse(
        notModifiedResponse,
        'api-key'
      );

      expect(extensionResult).toBe(true);
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
