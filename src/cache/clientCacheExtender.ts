import { clientCacheStore } from '@/cache/clientCacheStore';
import type { ClientCacheEntry } from '@/types/cache';
import { getCurrentTimestamp } from '@/utils/timeUtils';

const extendEntryTTL = <T>(
  entry: ClientCacheEntry<T>,
  extensionSeconds: number,
): ClientCacheEntry<T> => ({
  ...entry,
  expiresAt: getCurrentTimestamp() + extensionSeconds * 1000,
  lastAccessed: getCurrentTimestamp(),
});

export const extendCacheEntryTTL = (
  cacheKey: string,
  extensionSeconds: number,
): boolean => {
  const entry = clientCacheStore.get(cacheKey);

  if (!entry) {
    return false;
  }

  const extendedEntry = extendEntryTTL(entry, extensionSeconds);
  clientCacheStore.set(cacheKey, extendedEntry);

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