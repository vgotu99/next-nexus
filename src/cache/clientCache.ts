import { clientCacheStore } from '@/cache/clientCacheStore';
import type { CacheHandler } from '@/types/cache';
import type {
  GetNextFetchDefinition,
  NextFetchDefinition,
} from '@/types/definition';
import { generateCacheKey, isCacheEntryExpired } from '@/utils/cacheUtils';
import { isGetDefinition } from '@/utils/definitionUtils';

const validateGetDefinition = (
  definition: NextFetchDefinition<unknown>
): void => {
  if (!isGetDefinition(definition)) {
    console.warn(
      '[next-fetch] clientCache is primarily designed for GET requests. ' +
        'Using it with mutation definitions may not work as expected.'
    );
  }
};

const generateCacheKeyFromDefinition = (
  definition: GetNextFetchDefinition<unknown>
): string => {
  const { method, endpoint, options } = definition;
  return generateCacheKey({
    endpoint,
    method,
    clientTags: options?.client?.tags,
    serverTags: options?.server?.tags,
  });
};

const createCacheHandler = <TData>(cacheKey: string): CacheHandler<TData> => {
  return {
    get: () => {
      return clientCacheStore.get<TData>(cacheKey)?.data;
    },

    set: updater => {
      const entry = clientCacheStore.get<TData>(cacheKey);

      if (!entry) return;

      const currentData = entry?.data;
      const newData = updater(currentData);
      const newEntry = {
        ...entry,
        data: newData,
      };

      clientCacheStore.set(cacheKey, newEntry);
    },

    remove: () => {
      clientCacheStore.delete(cacheKey);
    },

    invalidate: () => {
      const entry = clientCacheStore.get<TData>(cacheKey);
      if (entry) {
        clientCacheStore.set(cacheKey, { ...entry, expiresAt: 0 });
      }
    },

    isStale: () => {
      const entry = clientCacheStore.get(cacheKey);
      return !entry || isCacheEntryExpired(entry);
    },

    subscribe: callback => {
      return clientCacheStore.subscribe(cacheKey, entry => {
        callback(entry?.data as TData | undefined);
      });
    },
  };
};

export const clientCache = <TData = unknown>(
  definition: NextFetchDefinition<TData>
): CacheHandler<TData> => {
  validateGetDefinition(definition);

  if (!isGetDefinition(definition)) {
    throw new Error('clientCache only supports GET definitions');
  }

  const cacheKey = generateCacheKeyFromDefinition(definition);

  return createCacheHandler(cacheKey);
};
