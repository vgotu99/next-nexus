import type { ClientCacheMetadata } from '@/types/cache';
import { generateETag } from '@/utils/cacheUtils';
import { isServerEnvironment } from '@/utils/environmentUtils';

const IF_NONE_MATCH_HEADER = 'if-none-match';
const CACHE_REVALIDATION_HEADER = 'x-next-fetch-cache-revalidation';

export interface ETagValidationResult {
  shouldUseCache: boolean;
  clientETags: string[];
  dataETag: string;
}

export const parseIfNoneMatchHeader = (headerValue: string): string[] => {
  if (!headerValue || headerValue.trim() === '') {
    return [];
  }

  return headerValue
    .split(',')
    .map(etag => etag.trim())
    .filter(etag => etag.length > 0);
};

export const extractClientETags = (headers: Headers): string[] => {
  if (!isServerEnvironment()) {
    return [];
  }

  try {
    const ifNoneMatchValue = headers.get(IF_NONE_MATCH_HEADER);

    if (!ifNoneMatchValue) {
      return [];
    }

    return parseIfNoneMatchHeader(ifNoneMatchValue);
  } catch (error) {
    console.warn('[next-fetch] Failed to extract client ETags:', error);
    return [];
  }
};

export const validateETag = (
  data: unknown,
  clientETags: string[]
): ETagValidationResult => {
  const dataETag = generateETag(data);

  const shouldUseCache =
    clientETags.length > 0 && clientETags.includes(dataETag);

  return {
    shouldUseCache,
    clientETags,
    dataETag,
  };
};

export const createNotModifiedResponse = (
  url: string,
  etag: string,
  revalidationSignal?: string
): Response => {
  const headers = new Headers({
    etag: etag,
    'cache-control': 'no-cache',
  });

  if (revalidationSignal) {
    headers.set(CACHE_REVALIDATION_HEADER, revalidationSignal);
  }

  return new Response(null, {
    status: 304,
    statusText: 'Not Modified',
    headers,
  });
};

export const performETagValidation = (
  headers: Headers,
  data: unknown
): ETagValidationResult => {
  const clientETags = extractClientETags(headers);
  return validateETag(data, clientETags);
};

export const shouldRevalidateCache = (
  headers: Headers,
  data: unknown
): boolean => {
  const { shouldUseCache } = performETagValidation(headers, data);
  return !shouldUseCache;
};

export const findOriginalClientRevalidate = (
  clientCacheMetadata: ClientCacheMetadata[],
  targetETag: string
): number | undefined => {
  const matchingCache = clientCacheMetadata.find(
    meta => meta.etag === targetETag
  );

  return matchingCache?.clientRevalidate;
};

export const createConditionalResponse = (
  url: string,
  data: unknown,
  headers: Headers,
  clientCacheMetadata: ClientCacheMetadata[] = []
): { shouldSkip: boolean; response?: Response } => {
  const validation = performETagValidation(headers, data);

  if (validation.shouldUseCache) {
    const originalTTL = findOriginalClientRevalidate(
      clientCacheMetadata,
      validation.dataETag
    );

    const revalidationSignal = originalTTL
      ? `extend-ttl=${originalTTL}`
      : undefined;

    const notModifiedResponse = createNotModifiedResponse(
      url,
      validation.dataETag,
      revalidationSignal
    );

    return {
      shouldSkip: true,
      response: notModifiedResponse,
    };
  }

  return {
    shouldSkip: false,
  };
};
