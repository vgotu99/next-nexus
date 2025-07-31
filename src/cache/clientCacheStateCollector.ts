import { clientCacheStore } from '@/cache/clientCacheStore';
import type { ClientCacheMetadata, SerializedCacheState } from '@/types/cache';
import { isCacheEntryExpired } from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';

const MAX_HEADER_SIZE = 8192;

export const collectValidCacheMetadata = async (): Promise<
  ClientCacheMetadata[]
> => {
  if (!isClientEnvironment()) {
    return [];
  }

  const cacheKeys = await clientCacheStore.keys();

  const metadataPromises = cacheKeys.map(async key => {
    const entry = await clientCacheStore.get<unknown>(key);

    if (!entry || isCacheEntryExpired(entry)) {
      return null;
    }

    return {
      key: entry.key,
      expiresAt: entry.expiresAt,
      clientTags: entry.clientTags?.length ? entry.clientTags : undefined,
      serverTags: entry.serverTags?.length ? entry.serverTags : undefined,
      etag: entry.etag,
      clientRevalidate: entry.clientRevalidate,
    } as ClientCacheMetadata;
  });

  const resolvedMetadata = await Promise.all(metadataPromises);

  return resolvedMetadata.filter(
    (metadata): metadata is ClientCacheMetadata => metadata !== null
  );
};

export const serializeCacheState = (
  metadata: ClientCacheMetadata[]
): string => {
  const serializedState: SerializedCacheState = {
    metadata,
    timestamp: Date.now(),
  };

  return JSON.stringify(serializedState);
};

export const encodeForHeader = (data: string): string => {
  if (data.length > MAX_HEADER_SIZE) {
    console.warn(
      `Cache state data exceeds header size limit (${data.length} > ${MAX_HEADER_SIZE}). Truncating...`
    );
    return btoa(data.substring(0, MAX_HEADER_SIZE - 100));
  }

  return btoa(data);
};

export const createCacheStateHeader = async (): Promise<string | null> => {
  try {
    const metadata = await collectValidCacheMetadata();

    if (metadata.length === 0) {
      return null;
    }

    const serialized = serializeCacheState(metadata);
    const encoded = encodeForHeader(serialized);

    return encoded;
  } catch (error) {
    console.warn('Failed to create cache state header:', error);
    return null;
  }
};

export const hasValidCacheEntriesByCacheKeys = async (
  cacheKeys: string[]
): Promise<boolean[]> => {
  if (!isClientEnvironment() || cacheKeys.length === 0) {
    return cacheKeys.map(() => false);
  }

  const checkPromises = cacheKeys.map(async key => {
    const entry = await clientCacheStore.get(key);
    return entry !== null && !isCacheEntryExpired(entry);
  });

  return Promise.all(checkPromises);
};
