import { HEADERS } from '@/constants/cache';
import type { ClientCacheMetadata } from '@/types/cache';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';

const decodeFromHeader = (encodedData: string): string | null => {
  try {
    return atob(encodedData);
  } catch (error) {
    logger.warn('[Cache] Failed to decode client cache metadata header', error);
    return null;
  }
};

const parseClientCacheMetadata = (
  serializedData: string
): ClientCacheMetadata[] | null => {
  try {
    return JSON.parse(serializedData);
  } catch (error) {
    logger.warn('[Cache] Failed to parse client cache metadata', error);
    return null;
  }
};

export const extractClientCacheMetadataFromHeaders = (
  headers: Headers
): ClientCacheMetadata[] | null => {
  if (!isServerEnvironment()) {
    return null;
  }

  const headerValue = headers.get(HEADERS.CLIENT_CACHE);
  if (!headerValue) {
    return null;
  }

  const decoded = decodeFromHeader(headerValue);
  if (!decoded) {
    return null;
  }

  const parsed = parseClientCacheMetadata(decoded);
  if (!parsed) {
    return null;
  }

  return parsed;
};

export const hasClientCacheEntryByCacheKey = (
  clientCacheMetadata: ClientCacheMetadata,
  cacheKey: string
): boolean => clientCacheMetadata.cacheKey === cacheKey;

export const findExactClientCacheMetadata = (
  clientCacheMetadataArr: ClientCacheMetadata[],
  cacheKey: string
): ClientCacheMetadata | null => {
  if (!clientCacheMetadataArr) return null;

  return (
    clientCacheMetadataArr.find(metadata => metadata.cacheKey === cacheKey) ??
    null
  );
};
