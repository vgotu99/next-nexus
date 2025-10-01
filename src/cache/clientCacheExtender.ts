import { clientCacheStore } from '@/cache/clientCacheStore';
import { getCurrentTimestamp } from '@/utils/timeUtils';

export const extendCacheEntryTTL = (
  cacheKey: string,
  extensionSeconds: number
): boolean => {
  const hasEntry = clientCacheStore.has(cacheKey);

  if (!hasEntry) {
    return false;
  }

  clientCacheStore.update(cacheKey, {
    expiresAt: getCurrentTimestamp() + extensionSeconds * 1000,
  });

  return true;
};
