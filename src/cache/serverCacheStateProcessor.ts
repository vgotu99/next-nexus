import type { ClientCacheMetadata } from '@/types/cache';
import { isServerEnvironment } from '@/utils/environmentUtils';

const decodeFromHeader = (encodedData: string): string | null => {
  try {
    return atob(encodedData);
  } catch (error) {
    console.warn('Failed to decode client cache metadata header:', error);
    return null;
  }
};

const parseClientCacheMetadata = (
  serializedData: string
): ClientCacheMetadata | null => {
  try {
    return JSON.parse(serializedData);
  } catch (error) {
    console.warn('Failed to parse client cache metadata:', error);
    return null;
  }
};

export const extractClientCacheMetadataFromHeaders = (
  headers: Headers,
  headerName: string
): ClientCacheMetadata | null => {
  if (!isServerEnvironment()) {
    return null;
  }

  const headerValue = headers.get(headerName);
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
): boolean => {
  return clientCacheMetadata.key === cacheKey;
};
