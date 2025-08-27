import { clientCacheStore } from '@/cache/clientCacheStore';
import { getCurrentTimestamp } from '@/utils/timeUtils';

export const extendCacheEntryTTL = (
  cacheKey: string,
  extensionSeconds: number
): boolean => {
  const entry = clientCacheStore.get(cacheKey);

  if (!entry) {
    return false;
  }

  clientCacheStore.update(cacheKey, {
    expiresAt: getCurrentTimestamp() + extensionSeconds * 1000,
  });

  return true;
};
