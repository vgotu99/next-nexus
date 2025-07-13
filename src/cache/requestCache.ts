import { cache } from "react";
import type { RequestCacheItem } from "@/types";

const createKey = (fullURL: string, method: string) => `${method}:${fullURL}`;

export const getRequestCache = cache(() => {
  const dataToHydrate: Map<string, RequestCacheItem> = new Map();

  return {
    add: (item: Omit<RequestCacheItem, "timestamp">) => {
      const key = createKey(item.fullURL, item.method);
      const cacheItem: RequestCacheItem = {
        ...item,
        timestamp: Date.now(),
      };

      dataToHydrate.set(key, cacheItem);
    },

    getAll: (): RequestCacheItem[] => {
      return Array.from(dataToHydrate.values());
    },

    clear: () => {
      dataToHydrate.clear();
    },

    size: (): number => {
      return dataToHydrate.size;
    },

    has: (fullURL: string, method: string = "GET"): boolean => {
      return dataToHydrate.has(createKey(fullURL, method));
    },
  };
});
