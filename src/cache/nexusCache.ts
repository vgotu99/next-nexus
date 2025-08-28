import { clientCacheStore } from '@/cache/clientCacheStore';
import type { CacheHandler } from '@/types/cache';
import type { NexusDefinition } from '@/types/definition';
import {
  generateCacheKeyFromDefinition,
  isCacheEntryExpired,
} from '@/utils/cacheUtils';
import { isGetDefinition } from '@/utils/definitionUtils';
import { logger } from '@/utils/logger';

const validateGetDefinition = (
  definition: NexusDefinition<unknown>
): void => {
  if (!isGetDefinition(definition)) {
    logger.warn('[Cache] nexusCache is primarily designed for GET requests. Using it with mutation definitions may not work as expected.');
  }
};

const createCacheHandler = <TData>(cacheKey: string): CacheHandler<TData> => {
  const getData = (): TData | undefined => {
    const entry = clientCacheStore.get<TData>(cacheKey);
    return entry?.data;
  };

  const updateEntry = (
    updater: (oldData: TData | undefined) => TData
  ): void => {
    const entry = clientCacheStore.get<TData>(cacheKey);
    if (!entry) return;

    const newData = updater(entry.data);
    const updatedEntry = {
      ...entry,
      data: newData,
      source: 'manual' as const,
    };
    clientCacheStore.update(cacheKey, updatedEntry);
  };

  const invalidateEntry = (): void => {
    const entry = clientCacheStore.get<TData>(cacheKey);
    if (!entry) return;

    clientCacheStore.update(cacheKey, {
      expiresAt: 0,
      source: 'manual' as const,
    });
  };

  const checkStaleStatus = (): boolean => {
    const entry = clientCacheStore.get(cacheKey);
    return !entry || isCacheEntryExpired(entry);
  };

  const subscribeToChanges = (callback: (data: TData | undefined) => void) => {
    return clientCacheStore.subscribe(cacheKey, entry => {
      callback(entry?.data as TData | undefined);
    });
  };

  return {
    get: getData,
    set: updateEntry,
    remove: () => clientCacheStore.delete(cacheKey),
    invalidate: invalidateEntry,
    isStale: checkStaleStatus,
    subscribe: subscribeToChanges,
  };
};

export const nexusCache = <TData = unknown>(
  definition: NexusDefinition<TData>
): CacheHandler<TData> => {
  validateGetDefinition(definition);

  if (!isGetDefinition(definition)) {
    throw new Error('nexusCache only supports GET definitions');
  }

  const cacheKey = generateCacheKeyFromDefinition(definition);
  return createCacheHandler<TData>(cacheKey);
};
