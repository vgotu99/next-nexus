import { HEADERS } from '@/constants/cache';
import type { ClientCacheMetadata } from '@/types/cache';
import { generateETag } from '@/utils/cacheUtils';

interface ETagValidationResult {
  shouldUseCache: boolean;
  clientETags: string;
  dataETag: string;
}

const validateClientETagWithResponseDataETag = (
  data: unknown,
  clientETags: string
): ETagValidationResult => {
  if (!clientETags) {
    return {
      shouldUseCache: false,
      clientETags: '',
      dataETag: '',
    };
  }
  const dataETag = generateETag(data);

  const shouldUseCache = clientETags.includes(dataETag);

  return {
    shouldUseCache,
    clientETags,
    dataETag,
  };
};

const createNotModifiedResponse = (etag: string): Response => {
  const headers = new Headers({
    'cache-control': 'no-cache',
    [HEADERS.CACHE_STATUS]: 'ETAG_MATCH',
  });

  headers.set(HEADERS.RESPONSE_ETAG, etag);

  return new Response(null, {
    status: 304,
    statusText: 'Not Modified',
    headers,
  });
};

export const createConditionalResponse = (
  data: unknown,
  clientCacheMetadata: ClientCacheMetadata
): { shouldSkip: boolean; response?: Response } => {
  const validation = validateClientETagWithResponseDataETag(
    data,
    clientCacheMetadata.etag || ''
  );

  if (validation.shouldUseCache) {
    const notModifiedResponse = createNotModifiedResponse(validation.dataETag);

    return {
      shouldSkip: true,
      response: notModifiedResponse,
    };
  }

  return {
    shouldSkip: false,
  };
};
