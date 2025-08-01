import { clientCacheStore } from '@/cache/clientCacheStore';
import { getCurrentTimestamp } from '@/utils/timeUtils';

export const extendCacheEntryTTL = (
  cacheKey: string,
  extensionSeconds: number,
): boolean => {
  const entry = clientCacheStore.get(cacheKey);

  if (!entry) {
    return false;
  }

  clientCacheStore.update(cacheKey, {
    expiresAt: getCurrentTimestamp() + extensionSeconds * 1000,
    source: 'fetch',
  });

  return true;
};

export const extendCacheEntriesTTL = (
  cacheKeys: string[],
  extensionSeconds: number,
): number => {
  if (!cacheKeys.length) {
    return 0;
  }

  const results = cacheKeys.map(key => extendCacheEntryTTL(key, extensionSeconds));

  return results.filter(Boolean).length;
};