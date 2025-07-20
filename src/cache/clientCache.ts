import type { ClientCacheEntry, ClientCacheState } from '@/types/cache';
import {
  createCacheEntry,
  isCacheEntryExpired,
  normalizeCacheTags,
  hasCommonTags,
} from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';
import { getCurrentTimestamp } from '@/utils/timeUtils';

declare global {
  interface Window {
    __nextFetchClientCache?: typeof clientCache;
  }
}

const clientCacheState: ClientCacheState = {
  clientCache: new Map(),
  maxSize: 200,
  defaultTTL: 3 * 60 * 1000,
};

const createClientCacheEntry = <T>(
  data: T,
  key: string,
  ttl: number,
  clientTags: string[] = [],
  serverTags: string[] = [],
  source: ClientCacheEntry['source'] = 'manual'
): ClientCacheEntry<T> => {
  const baseEntry = createCacheEntry(data, key, ttl, clientTags, serverTags);
  return {
    ...baseEntry,
    source,
    lastAccessed: getCurrentTimestamp(),
  };
};

const findLRUKey = (
  clientCache: Map<string, ClientCacheEntry>
): string | null => {
  const entries = Array.from(clientCache.entries());

  const oldestEntry = entries.reduce(
    (oldest, [key, entry]) =>
      entry.lastAccessed < oldest.lastAccessed
        ? { key, lastAccessed: entry.lastAccessed }
        : oldest,
    { key: '', lastAccessed: Infinity }
  );

  return oldestEntry.key || null;
};

const shouldDelete = (
  clientCache: Map<string, ClientCacheEntry>,
  maxSize: number,
  key: string
): boolean => clientCache.size >= maxSize && !clientCache.has(key);

const filterExpiredEntries = (
  clientCache: Map<string, ClientCacheEntry>
): Map<string, ClientCacheEntry> => {
  const validEntries = Array.from(clientCache.entries()).filter(
    ([, entry]) => !isCacheEntryExpired(entry)
  );

  return new Map(validEntries);
};

const filterByTags = (
  clientCache: Map<string, ClientCacheEntry>,
  tags: string[]
): string[] => {
  const normalizedTags = normalizeCacheTags(tags);

  return Array.from(clientCache.entries())
    .filter(([, entry]) => {
      const allEntryTags = [
        ...(entry.clientTags || []),
        ...(entry.serverTags || []),
      ];
      return hasCommonTags(allEntryTags, normalizedTags);
    })
    .map(([key]) => key);
};

const updateLastAccessed = <T>(
  entry: ClientCacheEntry<T>
): ClientCacheEntry<T> => ({
  ...entry,
  lastAccessed: getCurrentTimestamp(),
});

const calculateStats = (clientCache: Map<string, ClientCacheEntry>) => {
  const entries = Array.from(clientCache.values());

  return entries.reduce(
    (stats, entry) => ({
      ...stats,
      expired: stats.expired + (isCacheEntryExpired(entry) ? 1 : 0),
      bySource: {
        ...stats.bySource,
        [entry.source]: stats.bySource[entry.source] + 1,
      },
    }),
    {
      expired: 0,
      bySource: { fetch: 0, hydration: 0, manual: 0 },
    }
  );
};

const get = async <T = unknown>(
  key: string
): Promise<ClientCacheEntry<T> | null> => {
  if (!isClientEnvironment()) {
    return null;
  }

  const entry = clientCacheState.clientCache.get(key) as
    | ClientCacheEntry<T>
    | undefined;
  if (!entry) {
    return null;
  }

  if (isCacheEntryExpired(entry)) {
    clientCacheState.clientCache.delete(key);

    return null;
  }

  const updatedEntry = updateLastAccessed(entry);
  clientCacheState.clientCache.set(key, updatedEntry);

  return updatedEntry;
};

const set = async <T = unknown>(
  key: string,
  entry: ClientCacheEntry<T>
): Promise<void> => {
  if (!isClientEnvironment()) {
    return;
  }

  const lruKey = shouldDelete(
    clientCacheState.clientCache,
    clientCacheState.maxSize,
    key
  )
    ? findLRUKey(clientCacheState.clientCache)
    : null;

  if (lruKey) {
    clientCacheState.clientCache.delete(lruKey);
  }

  clientCacheState.clientCache.set(key, entry);
};

const setWithTTL = async <T = unknown>(
  key: string,
  data: T,
  clientRevalidate?: number,
  clientTags?: string[],
  serverTags?: string[],
  source: ClientCacheEntry['source'] = 'fetch'
): Promise<void> => {
  if (!isClientEnvironment()) {
    return;
  }

  const ttl = clientRevalidate
    ? clientRevalidate * 1000
    : clientCacheState.defaultTTL;
  const entry = createClientCacheEntry(
    data,
    key,
    ttl,
    clientTags,
    serverTags,
    source
  );

  await set(key, entry);
};

const deleteKey = async (key: string): Promise<boolean> => {
  if (!isClientEnvironment()) {
    return false;
  }

  return clientCacheState.clientCache.delete(key);
};

const clear = async (): Promise<void> => {
  if (!isClientEnvironment()) {
    return;
  }

  clientCacheState.clientCache.clear();
};

const keys = async (): Promise<string[]> => {
  if (!isClientEnvironment()) {
    return [];
  }

  return Array.from(clientCacheState.clientCache.keys());
};

const has = async (key: string): Promise<boolean> => {
  if (!isClientEnvironment()) {
    return false;
  }

  const entry = await get(key);
  return entry !== null;
};

const size = async (): Promise<number> => {
  if (!isClientEnvironment()) {
    return 0;
  }

  return clientCacheState.clientCache.size;
};

const invalidateByTags = async (tags: string[]): Promise<void> => {
  if (!isClientEnvironment() || !tags.length) {
    return;
  }

  const keysToDelete = filterByTags(clientCacheState.clientCache, tags);
  keysToDelete.forEach(key => clientCacheState.clientCache.delete(key));
};

const cleanup = async (): Promise<number> => {
  if (!isClientEnvironment()) {
    return 0;
  }

  const originalSize = clientCacheState.clientCache.size;
  clientCacheState.clientCache = filterExpiredEntries(
    clientCacheState.clientCache
  );

  return originalSize - clientCacheState.clientCache.size;
};

const getStats = async () => {
  const defaultStats = {
    size: 0,
    maxSize: clientCacheState.maxSize,
    expired: 0,
    bySource: { fetch: 0, hydration: 0, manual: 0 },
  };

  if (!isClientEnvironment()) {
    return defaultStats;
  }

  const stats = calculateStats(clientCacheState.clientCache);

  return {
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
    ...stats,
  };
};

export const clientCache = {
  get,
  set,
  setWithTTL,
  delete: deleteKey,
  clear,
  keys,
  has,
  size,
  invalidateByTags,
  cleanup,
  getStats,
};
