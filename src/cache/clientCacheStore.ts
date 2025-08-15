import { DEFAULT_CLIENT_CACHE_MAX_SIZE } from '@/constants/cache';
import { ERROR_MESSAGE_PREFIX } from '@/constants/errorMessages';
import { trackCache } from '@/debug/tracker';
import type { ClientCacheEntry, ClientCacheState } from '@/types/cache';
import { createCacheEntry, normalizeCacheTags } from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';
import { getCurrentTimestamp } from '@/utils/timeUtils';

declare global {
  interface Window {
    __nextFetchClientCache?: typeof clientCacheStore;
  }
}

const clientCacheState: ClientCacheState = {
  clientCache: new Map(),
  tagIndex: new Map(),
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
  entry: Omit<ClientCacheEntry<T>, 'key' | 'createdAt' | 'expiresAt'>
): ClientCacheEntry<T> => {
  const baseEntry = createCacheEntry(
    entry.data,
    entry.clientRevalidate,
    entry.clientTags,
    entry.serverTags,
    entry.etag
  );

  return {
    ...baseEntry,
    source: entry.source,
    headers: entry.headers,
  };
};

const touchCacheEntry = (key: string, entry: ClientCacheEntry): void => {
  clientCacheState.clientCache.delete(key);
  clientCacheState.clientCache.set(key, entry);
};

const getLRUKey = (
  clientCache: Map<string, ClientCacheEntry>
): string | null => {
  const iterator = clientCache.keys().next();
  return iterator.done ? null : iterator.value;
};

const shouldEvictEntry = (
  clientCache: Map<string, ClientCacheEntry>,
  maxSize: number
): boolean => clientCache.size >= maxSize;

const indexTags = (key: string, tags: string[] = []): void => {
  if (!tags.length) return;

  tags.forEach(tag => {
    const set = clientCacheState.tagIndex.get(tag) ?? new Set<string>();

    if (!clientCacheState.tagIndex.has(tag)) {
      clientCacheState.tagIndex.set(tag, set);
    }

    set.add(key);
  });
};

const unindexTags = (key: string, tags: string[] = []): void => {
  if (!tags.length) return;

  tags.forEach(tag => {
    const set = clientCacheState.tagIndex.get(tag);

    if (!set) return;

    set.delete(key);

    if (set.size === 0) clientCacheState.tagIndex.delete(tag);
  });
};

const replaceTagsIndex = (
  key: string,
  oldTags: string[] = [],
  newTags: string[] = []
): void => {
  if (oldTags.length === 0 && newTags.length === 0) return;

  const oldSet = new Set(oldTags);
  const newSet = new Set(newTags);

  oldSet.forEach(tag => {
    if (!newSet.has(tag)) unindexTags(key, [tag]);
  });

  newSet.forEach(tag => {
    if (!oldSet.has(tag)) indexTags(key, [tag]);
  });
};

const getKeysByTags = (tags: string[]): string[] => {
  const normalizedTags = normalizeCacheTags(tags);
  if (!normalizedTags.length) return [];

  const keys = new Set<string>();

  normalizedTags.forEach(tag => {
    const set = clientCacheState.tagIndex.get(tag);

    if (!set) return;

    set.forEach(key => keys.add(key));
  });

  return Array.from(keys);
};

const setClientCache = <T = unknown>(
  key: string,
  entry: ClientCacheEntry<T>
): void => {
  if (!isClientEnvironment()) return;

  if (clientCacheState.clientCache.has(key)) {
    touchCacheEntry(key, entry);
    notify(key, entry);
    return;
  }

  if (
    shouldEvictEntry(clientCacheState.clientCache, clientCacheState.maxSize)
  ) {
    const lruKey = getLRUKey(clientCacheState.clientCache);
    if (lruKey) {
      const evicted = clientCacheState.clientCache.get(lruKey);
      if (evicted?.clientTags?.length) {
        unindexTags(lruKey, evicted.clientTags);
      }
      clientCacheState.clientCache.delete(lruKey);
    }
  }

  touchCacheEntry(key, entry);
  notify(key, entry);
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

  touchCacheEntry(key, entry);

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

  return entry;
};

const set = <T = unknown>(
  key: string,
  entry: Omit<ClientCacheEntry<T>, 'key' | 'createdAt' | 'expiresAt'>
): void => {
  if (!isClientEnvironment()) return;

  const isUpdated = clientCacheState.clientCache.has(key);

  const clientCacheEntry = createClientCacheEntry(entry);

  if (isUpdated) {
    replaceTagsIndex(key, [], clientCacheEntry.clientTags || []);
  }

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

  const existingEntry = clientCacheState.clientCache.get(key);
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

  const existingEntry = clientCacheState.clientCache.get(key);
  if (existingEntry?.clientTags?.length) {
    unindexTags(key, existingEntry.clientTags);
  }

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

const size = (): number => {
  if (!isClientEnvironment()) return 0;
  return clientCacheState.clientCache.size;
};

const revalidateByTags = (tags: string[]): void => {
  if (!isClientEnvironment() || !tags.length) return;

  const keysToDelete = getKeysByTags(tags);
  keysToDelete.forEach(key => deleteKey(key));
};

const getMaxSize = () => {
  return clientCacheState.maxSize;
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
  size,
  revalidateByTags,
  getMaxSize,
  subscribe,
  setMaxSize,
};
