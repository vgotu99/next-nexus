import { trackCache } from '@/debug/tracker';
import type { ClientCacheEntry, ClientCacheState } from '@/types/cache';
import {
  createCacheEntry,
  getTTLFromExpiresAt,
  normalizeCacheTags,
} from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';
import { getCurrentTimestamp } from '@/utils/timeUtils';

const clientCacheState: ClientCacheState = {
  clientCache: new Map(),
  tagIndex: new Map(),
  pathnameIndex: new Map(),
  keyToPathnames: new Map(),
  maxSize: 200,
};

const listeners = new Map<
  string,
  Set<(entry: ClientCacheEntry | null) => void>
>();

const pending = new Map<string, ClientCacheEntry | null>();

const flush = (): void => {
  const batch = Array.from(pending.entries());
  pending.clear();

  batch.forEach(([cacheKey, entry]) => {
    const keyListeners = listeners.get(cacheKey);
    if (!keyListeners || keyListeners.size === 0) return;

    Array.from(keyListeners).forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        logger.error(`[Core] Error in cache listener:`, error);
      }
    });
  });
};

const notify = (cacheKey: string, entry: ClientCacheEntry | null): void => {
  const shouldSchedule = pending.size === 0;

  pending.set(cacheKey, entry);

  if (shouldSchedule) {
    queueMicrotask(flush);
  }
};

const subscribe = (
  cacheKey: string,
  callback: (entry: ClientCacheEntry | null) => void
): (() => void) => {
  if (!isClientEnvironment()) return () => {};

  if (!listeners.has(cacheKey)) {
    listeners.set(cacheKey, new Set());
  }

  const keyListeners = listeners.get(cacheKey)!;
  keyListeners.add(callback);

  return () => {
    const keyListeners = listeners.get(cacheKey);
    if (!keyListeners) return;

    keyListeners.delete(callback);

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

const normalizePathname = (pathname?: string): string => {
  if (!pathname) return '/';

  const decoded = decodeURI(pathname);

  if (!decoded || decoded === '/') return '/';

  return decoded.endsWith('/') ? decoded.slice(0, -1) : decoded;
};

const indexPathname = (pathname: string, keys: string[] | string): void => {
  if (!isClientEnvironment()) return;
  const normalized = normalizePathname(pathname);
  const list = Array.isArray(keys) ? keys : [keys];
  const set =
    clientCacheState.pathnameIndex.get(normalized) ?? new Set<string>();

  list.forEach(key => {
    set.add(key);
    const rev = clientCacheState.keyToPathnames.get(key) ?? new Set<string>();
    rev.add(normalized);
    clientCacheState.keyToPathnames.set(key, rev);
  });

  clientCacheState.pathnameIndex.set(normalized, set);
};

const unindexKeyFromPathname = (pathname: string, key: string): void => {
  if (!isClientEnvironment()) return;
  const normalized = normalizePathname(pathname);
  const set = clientCacheState.pathnameIndex.get(normalized);
  if (set) {
    set.delete(key);
    if (set.size === 0) clientCacheState.pathnameIndex.delete(normalized);
  }
  const rev = clientCacheState.keyToPathnames.get(key);
  if (rev) {
    rev.delete(normalized);
    if (rev.size === 0) clientCacheState.keyToPathnames.delete(key);
  }
};

const unindexPathname = (pathname?: string): void => {
  if (!isClientEnvironment()) return;
  const normalized = normalizePathname(pathname);
  const set = clientCacheState.pathnameIndex.get(normalized);
  if (!set) return;
  set.forEach(key => {
    const rev = clientCacheState.keyToPathnames.get(key);
    if (rev) {
      rev.delete(normalized);
      if (rev.size === 0) clientCacheState.keyToPathnames.delete(key);
    }
  });
  clientCacheState.pathnameIndex.delete(normalized);
};

const getCacheKeysFromPathname = (pathname: string): string[] => {
  const normalized = normalizePathname(pathname);
  const keys = clientCacheState.pathnameIndex.get(normalized);

  return Array.from(keys ?? new Set<string>());
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

  indexTags(key, entry.clientTags);
  touchCacheEntry(key, entry);
  notify(key, entry);
};

const readEntry = <T = unknown>(key: string): ClientCacheEntry<T> | null => {
  if (!isClientEnvironment()) return null;

  const entry = clientCacheState.clientCache.get(key) as
    | ClientCacheEntry<T>
    | undefined;

  if (!entry) return null;

  touchCacheEntry(key, entry);

  return entry;
};

const get = <T = unknown>(key: string): ClientCacheEntry<T> | null => {
  return readEntry<T>(key);
};

const getWithTracking = <T = unknown>(
  key: string
): ClientCacheEntry<T> | null => {
  if (!isClientEnvironment()) return null;

  const entry = readEntry<T>(key);

  if (!entry) {
    trackCache({
      type: 'MISS',
      key,
      size: clientCacheState.clientCache.size,
      maxSize: clientCacheState.maxSize,
    });

    return null;
  }

  trackCache({
    type: 'HIT',
    key,
    source: `client-${entry.source}`,
    tags: entry.clientTags,
    revalidate: entry.clientRevalidate,
    ttl: getTTLFromExpiresAt(entry.expiresAt),
    size: clientCacheState.clientCache.size,
    maxSize: clientCacheState.maxSize,
  });

  return entry;
};

const has = (key: string): boolean => {
  return clientCacheState.clientCache.has(key);
};

const set = <T = unknown>(
  key: string,
  entry: Omit<ClientCacheEntry<T>, 'key' | 'createdAt' | 'expiresAt'>
): void => {
  if (!isClientEnvironment()) return;

  const isUpdated = clientCacheState.clientCache.has(key);

  const clientCacheEntry = createClientCacheEntry(entry);

  setClientCache(key, clientCacheEntry);

  trackCache({
    type: isUpdated ? 'UPDATE' : 'SET',
    key,
    source: `client-${clientCacheEntry.source}`,
    tags: clientCacheEntry.clientTags,
    revalidate: clientCacheEntry.clientRevalidate,
    ttl: getTTLFromExpiresAt(clientCacheEntry.expiresAt),
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
    ttl: getTTLFromExpiresAt(updatedEntry.expiresAt),
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
    const pathnames = clientCacheState.keyToPathnames.get(key);
    if (pathnames) {
      pathnames.forEach(p => {
        const set = clientCacheState.pathnameIndex.get(p);
        if (set) {
          set.delete(key);
          if (set.size === 0) clientCacheState.pathnameIndex.delete(p);
        }
      });
      clientCacheState.keyToPathnames.delete(key);
    }

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

const invalidate = (key: string) => {
  const hasEntry = clientCacheState.clientCache.has(key);

  if (!hasEntry) return;

  update(key, { expiresAt: 0, source: 'manual' });
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
  getWithTracking,
  has,
  set,
  update,
  delete: deleteKey,
  size,
  invalidate,
  getKeysByTags,
  getMaxSize,
  subscribe,
  setMaxSize,
  indexPathname,
  unindexPathname,
  unindexKeyFromPathname,
  getCacheKeysFromPathname,
};
