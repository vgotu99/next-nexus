import type { ClientCacheEntry, ClientCacheMetadata } from '@/types/cache';
import { isCacheEntryExpired } from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';

const MAX_HEADER_SIZE = 8192;

const encodeForHeader = (data: string): string | null => {
  try {
    if (data.length > MAX_HEADER_SIZE) {
      console.warn(
        `Client cache metadata exceeds header size limit (${data.length} > ${MAX_HEADER_SIZE}). Truncating...`
      );
      return btoa(data.substring(0, MAX_HEADER_SIZE - 100));
    }

    return btoa(data);
  } catch (error) {
    console.warn('Failed to encode client cache metadata for header:', error);
    return null;
  }
};

const serializeClientCacheMetadata = (
  metadata: ClientCacheMetadata
): string | null => {
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.warn('Failed to serialize client cache metadata:', error);
    return null;
  }
};

export const collectValidClientCacheMetadata = (
  cacheKey: string,
  clientCacheEntry: ClientCacheEntry
): ClientCacheMetadata | null => {
  if (!isClientEnvironment() || isCacheEntryExpired(clientCacheEntry)) {
    return null;
  }

  return {
    cacheKey,
    expiresAt: clientCacheEntry.expiresAt,
    clientTags: clientCacheEntry.clientTags?.length
      ? clientCacheEntry.clientTags
      : undefined,
    serverTags: clientCacheEntry.serverTags?.length
      ? clientCacheEntry.serverTags
      : undefined,
    etag: clientCacheEntry.etag,
    clientRevalidate: clientCacheEntry.clientRevalidate,
  };
};

export const collectExpiredClientCacheMetadata = (
  cacheKey: string,
  clientCacheEntry: ClientCacheEntry
): ClientCacheMetadata | null => {
  if (
    !isClientEnvironment() ||
    !isCacheEntryExpired(clientCacheEntry) ||
    !clientCacheEntry.etag
  ) {
    return null;
  }

  return {
    cacheKey,
    etag: clientCacheEntry.etag,
    expiresAt: clientCacheEntry.expiresAt,
    clientRevalidate: clientCacheEntry.clientRevalidate,
  };
};

export const createClientCacheMetadataHeader = (
  metadata?: ClientCacheMetadata
): string | null => {
  if (!metadata) {
    return null;
  }

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
