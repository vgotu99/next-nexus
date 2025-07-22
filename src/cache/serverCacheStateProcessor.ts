import type { ClientCacheMetadata, SerializedCacheState } from '@/types';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { getCurrentTimestamp } from '@/utils/timeUtils';

const CLIENT_CACHE_HEADER = 'x-next-fetch-client-cache';

export const decodeFromHeader = (encodedData: string): string | null => {
  try {
    return atob(encodedData);
  } catch (error) {
    console.warn('Failed to decode cache state header:', error);
    return null;
  }
};

export const parseCacheState = (
  serializedData: string
): SerializedCacheState | null => {
  try {
    const parsed = JSON.parse(serializedData) as SerializedCacheState;

    if (
      !parsed ||
      !Array.isArray(parsed.metadata) ||
      typeof parsed.timestamp !== 'number'
    ) {
      console.warn('Invalid cache state structure');
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('Failed to parse cache state:', error);
    return null;
  }
};

export const validateCacheMetadata = (
  metadata: ClientCacheMetadata[]
): ClientCacheMetadata[] => {
  const currentTime = getCurrentTimestamp();

  return metadata.filter(item => {
    if (!item.key || typeof item.expiresAt !== 'number') {
      return false;
    }

    if (item.expiresAt !== Infinity && item.expiresAt <= currentTime) {
      return false;
    }

    return true;
  });
};

export const extractClientCacheState = (
  request: Request
): ClientCacheMetadata[] => {
  if (!isServerEnvironment()) {
    return [];
  }

  try {
    const headerValue = request.headers.get(CLIENT_CACHE_HEADER);

    if (!headerValue) {
      return [];
    }

    const decoded = decodeFromHeader(headerValue);
    if (!decoded) {
      return [];
    }

    const parsed = parseCacheState(decoded);
    if (!parsed) {
      return [];
    }

    return validateCacheMetadata(parsed.metadata);
  } catch (error) {
    console.warn('Failed to extract client cache state:', error);
    return [];
  }
};

export const extractClientCacheStateFromHeaders = (
  headers: Headers
): ClientCacheMetadata[] => {
  if (!isServerEnvironment()) {
    return [];
  }

  try {
    const headerValue = headers.get(CLIENT_CACHE_HEADER);

    if (!headerValue) {
      return [];
    }

    const decoded = decodeFromHeader(headerValue);
    if (!decoded) {
      return [];
    }

    const parsed = parseCacheState(decoded);
    if (!parsed) {
      return [];
    }

    return validateCacheMetadata(parsed.metadata);
  } catch (error) {
    console.warn('Failed to extract client cache state from headers:', error);
    return [];
  }
};

export const hasClientCacheEntryByCacheKey = (
  clientCacheState: ClientCacheMetadata[],
  cacheKey: string
): boolean => {
  return clientCacheState.some(metadata => metadata.key === cacheKey);
};

export const hasClientCacheByTags = (
  clientCacheState: ClientCacheMetadata[],
  tags: string[]
): boolean => {
  if (!tags.length || !clientCacheState.length) {
    return false;
  }

  return clientCacheState.some(metadata => {
    const allTags = [
      ...(metadata.clientTags || []),
      ...(metadata.serverTags || []),
    ];

    return tags.some(tag => allTags.includes(tag));
  });
};

export const getExcludedCacheKeys = (
  clientCacheState: ClientCacheMetadata[],
  potentialKeys: string[]
): string[] => {
  return potentialKeys.filter(key =>
    hasClientCacheEntryByCacheKey(clientCacheState, key)
  );
};
