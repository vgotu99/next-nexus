import { DEFAULT_CLIENT_CACHE_MAX_SIZE } from '@/constants/cache';
import { ERROR_MESSAGE_PREFIX } from '@/constants/errorMessages';
import { trackCache } from '@/debug/tracker';
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
    __nextFetchClientCache?: typeof clientCacheStore;
  }
}

const clientCacheState: ClientCacheState = {
  clientCache: new Map(),
  maxSize: DEFAULT_CLIENT_CACHE_MAX_SIZE,
};

const listeners = new Map<
  string,
  Set<(entry: ClientCacheEntry | null) => void>
>();

const notify = (cacheKey: string, entry: ClientCacheEntry | null): void => {
  const keyListeners = listeners.get(cacheKey);
  if (!keyListeners) return;

  keyListeners.forEach(callback => {
    try {
      callback(entry);
    } catch (error) {
      console.error(`${ERROR_MESSAGE_PREFIX} Error in cache listener:`, error);
    }
  });
};

const subscribe = <T = unknown>(
  cacheKey: string,
  callback: (entry: ClientCacheEntry<T> | null) => void
): (() => void) => {
  if (!isClientEnvironment()) return () => {};

  if (!listeners.has(cacheKey)) {
    listeners.set(cacheKey, new Set());
  }

  const keyListeners = listeners.get(cacheKey)!;
  keyListeners.add(callback as (entry: ClientCacheEntry | null) => void);

  return () => {
    const keyListeners = listeners.get(cacheKey);
    if (!keyListeners) return;

    keyListeners.delete(callback as (entry: ClientCacheEntry | null) => void);

    if (keyListeners.size === 0) {
      listeners.delete(cacheKey);
    }
  };
};

const createClientCacheEntry = <T>(
  key: string,
  entry: Omit<ClientCacheEntry<T>, 'key' | 'createdAt' | 'lastAccessed' | 'expiresAt'>
): ClientCacheEntry<T> => {
  const baseEntry = createCacheEntry(
    entry.data,
    key,
    entry.clientRevalidate,
    entry.clientTags,
    entry.serverTags,
    entry.etag
  );

  return {
    ...baseEntry,
    source: entry.source,
    headers: entry.headers,
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

const shouldEvictEntry = (
  clientCache: Map<string, ClientCacheEntry>,
  maxSize: number
): boolean => clientCache.size >= maxSize;

const filterByTags = (
  clientCache: Map<string, ClientCacheEntry>,
  tags: string[]
): string[] => {
  const normalizedTags = normalizeCacheTags(tags);

  return Array.from(clientCache.entries())
    .filter(([, entry]) => {
      const allEntryTags = entry.clientTags || [];
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

const setClientCache = <T = unknown>(
  key: string,
  entry: ClientCacheEntry<T>
): void => {
  if (!isClientEnvironment()) return;

  if (clientCacheState.clientCache.has(key)) {
    const updatedEntry = updateLastAccessed(entry);
    clientCacheState.clientCache.set(key, updatedEntry);
    notify(key, updatedEntry);
    return;
  }

  if (
    shouldEvictEntry(clientCacheState.clientCache, clientCacheState.maxSize)
  ) {
    const lruKey = findLRUKey(clientCacheState.clientCache);
    if (lruKey) {
      clientCacheState.clientCache.delete(lruKey);
    }
  }

  const updatedEntry = updateLastAccessed(entry);
  clientCacheState.clientCache.set(key, updatedEntry);
  notify(key, updatedEntry);
};

const get = <T = unknown>(key: string): ClientCacheEntry<T> | null => {
  if (!isClientEnvironment()) return null;

  const entry = clientCacheState.clientCache.get(key) as
    | ClientCacheEntry<T>
    | undefined;
  if (!entry) {
    trackCache({
      type: 'MISS',
      key,
      source: 'client-fetch',
      size: clientCacheState.clientCache.size,
      maxSize: clientCacheState.maxSize,
    });
    return null;
  }

  const updatedEntry = updateLastAccessed(entry);
  clientCacheState.clientCache.set(key, updatedEntry);

  trackCache({
    type: 'HIT',
    key,
    source: `client-${entry.source}`,
    tags: entry.clientTags,
    revalidate: entry.clientRevalidate,
    ttl: entry.clientRevalidate,
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
  });

  return updatedEntry;
};

const set = <T = unknown>(
  key: string,
  entry: Omit<ClientCacheEntry<T>, 'key' | 'createdAt' | 'lastAccessed' | 'expiresAt'>
): void => {
  if (!isClientEnvironment()) return;

  const isUpdated = clientCacheState.clientCache.has(key);

  const clientCacheEntry = createClientCacheEntry(
    key,
    entry
  );

  setClientCache(key, clientCacheEntry);

  trackCache({
    type: isUpdated ? 'UPDATE' : 'SET',
    key,
    source: `client-${clientCacheEntry.source}`,
    tags: clientCacheEntry.clientTags,
    revalidate: clientCacheEntry.clientRevalidate,
    ttl: clientCacheEntry.clientRevalidate,
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
  });
};

const update = <T = unknown>(
  key: string,
  partialEntry: Partial<Omit<ClientCacheEntry<T>, 'key' | 'createdAt'>>
): void => {
  if (!isClientEnvironment()) return;

  const existingEntry = clientCacheState.clientCache.get(key) as
    | ClientCacheEntry<T>
    | undefined;
  if (!existingEntry) return;

  const newPartialEntry = {
    ...partialEntry,
    expiresAt:
      partialEntry.expiresAt !== undefined
        ? partialEntry.expiresAt
        : existingEntry.clientRevalidate
          ? getCurrentTimestamp() + existingEntry.clientRevalidate * 1000
          : existingEntry.expiresAt,
  };

  const updatedEntry = { ...existingEntry, ...newPartialEntry };

  setClientCache(key, updatedEntry);

  trackCache({
    type: 'UPDATE',
    key,
    source: `client-${updatedEntry.source}`,
    tags: updatedEntry.clientTags,
    revalidate: updatedEntry.clientRevalidate,
    ttl: updatedEntry.clientRevalidate,
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
  });
};

const deleteKey = (key: string): boolean => {
  if (!isClientEnvironment()) return false;

  const deleted = clientCacheState.clientCache.delete(key);
  if (deleted) {
    notify(key, null);
    trackCache({
      type: 'DELETE',
      key,
      source: 'client-manual',
      size: clientCacheState.clientCache.size,
      maxSize: clientCacheState.maxSize,
    });
  }

  return deleted;
};

const clear = (): void => {
  if (!isClientEnvironment()) return;

  clientCacheState.clientCache.forEach((_value, key) => {
    notify(key, null);
  });

  clientCacheState.clientCache.clear();

  trackCache({
    type: 'CLEAR',
    key: 'ALL',
    source: 'client-manual',
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
  });
};

const keys = (): string[] => {
  if (!isClientEnvironment()) return [];
  return Array.from(clientCacheState.clientCache.keys());
};

const has = (key: string): boolean => {
  if (!isClientEnvironment()) return false;
  const entry = get(key);
  return entry !== null;
};

const size = (): number => {
  if (!isClientEnvironment()) return 0;
  return clientCacheState.clientCache.size;
};

const revalidateByTags = (tags: string[]): void => {
  if (!isClientEnvironment() || !tags.length) return;

  const keysToDelete = filterByTags(clientCacheState.clientCache, tags);
  keysToDelete.forEach(key => deleteKey(key));
};

const cleanup = (): number => {
  if (!isClientEnvironment()) return 0;

  const originalSize = size();
  const expiredKeys: string[] = [];

  clientCacheState.clientCache.forEach((entry, key) => {
    if (isCacheEntryExpired(entry)) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => deleteKey(key));

  return originalSize - size();
};

const getStats = () => {
  const defaultStats = {
    size: 0,
    maxSize: clientCacheState.maxSize,
    expired: 0,
    bySource: { fetch: 0, hydration: 0, manual: 0 },
  };

  if (!isClientEnvironment()) return defaultStats;

  const stats = calculateStats(clientCacheState.clientCache);

  return {
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
    ...stats,
  };
};

const autoCleanupState = { intervalId: null as NodeJS.Timeout | null };

const startAutoCleanup = (intervalMs: number = 60000): void => {
  if (!isClientEnvironment() || autoCleanupState.intervalId) return;

  autoCleanupState.intervalId = setInterval(() => {
    const removedCount = cleanup();
    if (removedCount > 0) {
      console.debug(
        `${ERROR_MESSAGE_PREFIX} Auto cleanup removed ${removedCount} expired entries`
      );
    }
  }, intervalMs);
};

const stopAutoCleanup = (): void => {
  if (autoCleanupState.intervalId) {
    clearInterval(autoCleanupState.intervalId);
    autoCleanupState.intervalId = null;
  }
};

const setMaxSize = (newSize: number): void => {
  if (!isClientEnvironment()) return;
  if (typeof newSize === 'number' && newSize > 0) {
    clientCacheState.maxSize = newSize;
  }
};

export const clientCacheStore = {
  get,
  set,
  update,
  delete: deleteKey,
  clear,
  keys,
  has,
  size,
  revalidateByTags,
  cleanup,
  getStats,
  subscribe,
  startAutoCleanup,
  stopAutoCleanup,
  setMaxSize,
};
