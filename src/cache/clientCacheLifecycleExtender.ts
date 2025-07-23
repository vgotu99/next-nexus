import { clientCache } from '@/cache/clientCache';
import { isCacheEntryExpired } from '@/utils/cacheUtils';
import { isClientEnvironment, isDevelopment } from '@/utils/environmentUtils';
import { getCurrentTimestamp } from '@/utils/timeUtils';

const CACHE_REVALIDATION_HEADER = 'x-next-fetch-cache-revalidation';

export interface CacheExtensionOptions {
  cacheKey: string;
  extensionTTL: number;
  reason: 'etag-match' | 'not-modified' | 'manual';
}

export const parseCacheRevalidationHeader = (
  headerValue: string
): number | null => {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/extend-ttl=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export const extractCacheExtensionInfo = (
  response: Response
): number | null => {
  try {
    const revalidationHeader = response.headers.get(CACHE_REVALIDATION_HEADER);

    if (!revalidationHeader) {
      return null;
    }

    return parseCacheRevalidationHeader(revalidationHeader);
  } catch (error) {
    console.warn('[next-fetch] Failed to extract cache extension info:', error);
    return null;
  }
};

export const extendCacheLifecycle = async (
  options: CacheExtensionOptions
): Promise<boolean> => {
  if (!isClientEnvironment()) {
    return false;
  }

  try {
    const { cacheKey, extensionTTL, reason } = options;
    const entry = await clientCache.get(cacheKey);

    if (!entry) {
      console.warn(`[next-fetch] Cache entry not found for key: ${cacheKey}`);
      return false;
    }

    if (!isCacheEntryExpired(entry)) {
      return true;
    }

    const now = getCurrentTimestamp();
    const newExpiresAt = now + extensionTTL * 1000;

    const extendedEntry = {
      ...entry,
      expiresAt: newExpiresAt,
      lastAccessed: now,
    };

    await clientCache.set(cacheKey, extendedEntry);

    if (isDevelopment()) {
      console.log(
        `[next-fetch] Extended cache lifecycle for ${cacheKey} (reason: ${reason}, ttl: ${extensionTTL}s)`
      );
    }

    return true;
  } catch (error) {
    console.warn(
      `[next-fetch] Failed to extend cache lifecycle for ${options.cacheKey}:`,
      error
    );
    return false;
  }
};

export const handleNotModifiedResponse = async (
  response: Response,
  cacheKey: string,
  defaultTTL: number = 180
): Promise<boolean> => {
  if (response.status !== 304) {
    return false;
  }

  const extensionTTL = extractCacheExtensionInfo(response) || defaultTTL;

  return extendCacheLifecycle({
    cacheKey,
    extensionTTL,
    reason: 'not-modified',
  });
};

export const handleETagMatchExtension = async (
  cacheKey: string,
  extensionTTL: number
): Promise<boolean> => {
  return extendCacheLifecycle({
    cacheKey,
    extensionTTL,
    reason: 'etag-match',
  });
};

export const extendMultipleCacheLifecycles = async (
  cacheKeys: string[],
  extensionTTL: number,
  reason: CacheExtensionOptions['reason'] = 'manual'
): Promise<{ success: string[]; failed: string[] }> => {
  const results = await Promise.allSettled(
    cacheKeys.map(cacheKey =>
      extendCacheLifecycle({ cacheKey, extensionTTL, reason })
    )
  );

  const success: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    const cacheKey = cacheKeys[index];

    result.status === 'fulfilled' && result.value
      ? success.push(cacheKey)
      : failed.push(cacheKey);
  });

  return { success, failed };
};
