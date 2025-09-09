import { cookies } from 'next/headers';

import { COOKIES } from '@/constants/cache';
import type { ClientCacheMetadata } from '@/types/cache';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';

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

export const extractClientCacheMetadataFromCookies = async (): Promise<
  ClientCacheMetadata[] | null
> => {
  if (!isServerEnvironment()) return null;
  try {
    const requestCookies = await cookies();

    const encoded = requestCookies.get(COOKIES.NEXUS_CLIENT_CACHE)?.value;

    if (!encoded) return null;

    const decoded = Buffer.from(encoded, 'base64').toString('utf8');

    const parsed = JSON.parse(decoded) as ClientCacheMetadata[];

    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    logger.warn(
      '[Cache] Failed to parse client cache metadata from cookies',
      e
    );
    return null;
  }
};
