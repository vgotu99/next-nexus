import type { ClientCacheEntry, ClientCacheMetadata } from '@/types/cache';
import { getTTLFromExpiresAt } from '@/utils/cacheUtils';
import { logger } from '@/utils/logger';

const MAX_HEADER_SIZE = 8192;

const encodeForHeader = (data: string): string | null => {
  try {
    if (data.length > MAX_HEADER_SIZE) {
      logger.warn(`[Cache] Client cache metadata exceeds header size limit (${data.length} > ${MAX_HEADER_SIZE}). Truncating...`);
      return btoa(data.substring(0, MAX_HEADER_SIZE - 100));
    }

    return btoa(data);
  } catch (error) {
    logger.warn('[Cache] Failed to encode client cache metadata for header', error);
    return null;
  }
};

const serializeClientCacheMetadata = (
  metadata: ClientCacheMetadata[]
): string | null => {
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    logger.warn('[Cache] Failed to serialize client cache metadata', error);
    return null;
  }
};

export const collectClientCacheMetadata = (
  cacheKey: string,
  clientCacheEntry: ClientCacheEntry
): ClientCacheMetadata => {
  const ttl = getTTLFromExpiresAt(clientCacheEntry.expiresAt);

  return {
    ttl,
    cacheKey,
    etag: clientCacheEntry.etag,
  };
};

export const createClientCacheMetadataHeader = (
  metadata: ClientCacheMetadata[]
): string | null => {
  const serialized = serializeClientCacheMetadata(metadata);

  if (!serialized) {
    return null;
  }

  const encoded = encodeForHeader(serialized);

  if (!encoded) {
    return null;
  }

  return encoded;
};
