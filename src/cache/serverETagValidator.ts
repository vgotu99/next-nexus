import type { ClientCacheMetadata } from '@/types/cache';
import { generateETag } from '@/utils/cacheUtils';

const validateClientETagWithResponseDataETag = (
  data: unknown,
  clientETags: string
): boolean => {
  if (!clientETags) {
    return false;
  }
  const dataETag = generateETag(data);

  const shouldUseCache = clientETags.includes(dataETag);

  return shouldUseCache;
};

export const isClientETagMatched = (
  data: unknown,
  clientCacheMetadata: ClientCacheMetadata
): boolean => {
  const clientETags = clientCacheMetadata.etag || '';
  const shouldUseCache = validateClientETagWithResponseDataETag(
    data,
    clientETags
  );

  return shouldUseCache;
};
