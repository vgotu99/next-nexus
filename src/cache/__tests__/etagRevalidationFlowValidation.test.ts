import { handleNotModifiedResponse } from '@/cache/clientCacheLifecycleExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import { createConditionalResponse } from '@/cache/serverETagValidator';
import type { ClientCacheMetadata } from '@/types/cache';
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

describe('ETag Revalidation Flow - client.revalidate TTL Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsClientEnvironment.mockReturnValue(true);
    mockIsServerEnvironment.mockReturnValue(true);
  });

  it('should use client.revalidate value for cache extension TTL', async () => {
    const testData = { id: 1, name: 'test' };
    const dataETag = generateETag(testData);
    const clientRevalidateTTL = 600;

    const clientCacheMetadata: ClientCacheMetadata[] = [
      {
        key: 'GET:/api/test',
        expiresAt: Date.now() - 60000,
        clientTags: undefined,
        serverTags: undefined,
        etag: dataETag,
        clientRevalidate: clientRevalidateTTL,
      },
    ];

    const headers = new Headers({
      'if-none-match': dataETag,
    });

    const conditionalResult = createConditionalResponse(
      '/api/test',
      testData,
      headers,
      clientCacheMetadata
    );

    expect(conditionalResult.shouldSkip).toBe(true);
    expect(conditionalResult.response?.status).toBe(304);
    expect(
      conditionalResult.response?.headers.get('x-next-fetch-cache-revalidation')
    ).toBe('extend-ttl=600');

    const expiredEntry = {
      key: 'test-key',
      data: testData,
      expiresAt: Date.now() - 60000,
      source: 'fetch' as const,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
    };

    mockClientCache.get.mockResolvedValue(expiredEntry);
    mockClientCache.set.mockResolvedValue();

    const result = await handleNotModifiedResponse(
      conditionalResult.response!,
      'test-key'
    );

    expect(result).toBe(true);

    expect(mockClientCache.set).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({
        expiresAt: expect.any(Number),
      })
    );

    const setCallArgs = mockClientCache.set.mock.calls[0][1];
    const actualExpiresAt = setCallArgs.expiresAt;
    const currentTime = Date.now();

    expect(actualExpiresAt).toBeGreaterThanOrEqual(currentTime + 599000);
    expect(actualExpiresAt).toBeLessThanOrEqual(currentTime + 601000);
  });

  it('should use default TTL when client.revalidate is not provided', async () => {
    const testData = { id: 1, name: 'test' };
    const dataETag = generateETag(testData);

    const clientCacheMetadata: ClientCacheMetadata[] = [
      {
        key: 'GET:/api/test',
        expiresAt: Date.now() - 60000,
        clientTags: undefined,
        serverTags: undefined,
        etag: dataETag,
        clientRevalidate: undefined,
      },
    ];

    const headers = new Headers({
      'if-none-match': dataETag,
    });

    const conditionalResult = createConditionalResponse(
      '/api/test',
      testData,
      headers,
      clientCacheMetadata
    );

    expect(conditionalResult.shouldSkip).toBe(true);
    expect(conditionalResult.response?.status).toBe(304);
    expect(
      conditionalResult.response?.headers.get('x-next-fetch-cache-revalidation')
    ).toBeNull();

    const expiredEntry = {
      key: 'test-key',
      data: testData,
      expiresAt: Date.now() - 60000,
      source: 'fetch' as const,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
    };

    mockClientCache.get.mockResolvedValue(expiredEntry);
    mockClientCache.set.mockResolvedValue();

    const result = await handleNotModifiedResponse(
      conditionalResult.response!,
      'test-key',
      300
    );

    expect(result).toBe(true);

    const setCallArgs = mockClientCache.set.mock.calls[0][1];
    const actualExpiresAt = setCallArgs.expiresAt;
    const currentTime = Date.now();

    expect(actualExpiresAt).toBeGreaterThanOrEqual(currentTime + 299000);
    expect(actualExpiresAt).toBeLessThanOrEqual(currentTime + 301000);
  });

  it('should handle custom client.revalidate values correctly', async () => {
    const testCases = [
      { revalidate: 60, description: '1분' },
      { revalidate: 1800, description: '30분' },
      { revalidate: 3600, description: '1시간' },
    ];

    for (const testCase of testCases) {
      const testData = { id: 1, value: testCase.revalidate };
      const dataETag = generateETag(testData);

      const clientCacheMetadata: ClientCacheMetadata[] = [
        {
          key: `GET:/api/test-${testCase.revalidate}`,
          expiresAt: Date.now() - 60000,
          clientTags: undefined,
          serverTags: undefined,
          etag: dataETag,
          clientRevalidate: testCase.revalidate,
        },
      ];

      const headers = new Headers({
        'if-none-match': dataETag,
      });

      const conditionalResult = createConditionalResponse(
        '/api/test',
        testData,
        headers,
        clientCacheMetadata
      );

      expect(
        conditionalResult.response?.headers.get(
          'x-next-fetch-cache-revalidation'
        )
      ).toBe(`extend-ttl=${testCase.revalidate}`);

      const expiredEntry = {
        key: `test-key-${testCase.revalidate}`,
        data: testData,
        expiresAt: Date.now() - 60000,
        source: 'fetch' as const,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
      };

      mockClientCache.get.mockResolvedValue(expiredEntry);
      mockClientCache.set.mockResolvedValue();

      await handleNotModifiedResponse(
        conditionalResult.response!,
        `test-key-${testCase.revalidate}`
      );

      const setCallArgs =
        mockClientCache.set.mock.calls[
          mockClientCache.set.mock.calls.length - 1
        ][1];
      const actualExpiresAt = setCallArgs.expiresAt;
      const currentTime = Date.now();

      const expectedMinTime = currentTime + testCase.revalidate * 1000 - 1000;
      const expectedMaxTime = currentTime + testCase.revalidate * 1000 + 1000;

      expect(actualExpiresAt).toBeGreaterThanOrEqual(expectedMinTime);
      expect(actualExpiresAt).toBeLessThanOrEqual(expectedMaxTime);
    }
  });
});
