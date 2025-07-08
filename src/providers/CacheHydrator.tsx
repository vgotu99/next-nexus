"use client";

import { useEffect } from "react";
import { clientCacheManager } from "../cache";
import type { RequestCacheItem } from "../types";

interface CacheHydratorProps {
  data: RequestCacheItem[];
}

export const CacheHydrator = ({ data }: CacheHydratorProps) => {
  useEffect(() => {
    const hydrateCache = async () => {
      if (!data || data.length === 0) {
        return;
      }

      try {
        const hydratePromises = data.map(async (item) => {
          try {
            const clientCacheConfig = item.config?.clientCache;
            const ttl = getClientCacheTTL(clientCacheConfig);
            const tags = getClientCacheTags(item.config);

            await clientCacheManager.set(item.fullURL, item.data, {
              method: item.method,
              ttl,
              tags,
              endpoint: item.endpoint,
              serverRevalidateInterval: item.config?.next?.revalidate,
            });
          } catch (error) {
            console.error(
              `Failed to hydrate ${item.method} ${item.fullURL}:`,
              error
            );
          }
        });

        await Promise.all(hydratePromises);
      } catch (error) {
        console.error("Cache hydration failed:", error);
      }
    };

    hydrateCache();
  }, []);

  return null;
};

const getClientCacheTTL = (clientCacheConfig: any): number => {
  if (!clientCacheConfig) {
    return 300;
  }

  if (typeof clientCacheConfig === "boolean") {
    return 300;
  }

  return clientCacheConfig.revalidate || 300;
};

const getClientCacheTags = (config: any): string[] => {
  const serverTags = config?.next?.tags || [];
  const clientCacheConfig = config?.clientCache;

  if (!clientCacheConfig || typeof clientCacheConfig === "boolean") {
    return serverTags;
  }

  const clientTags = clientCacheConfig.tags || [];

  return [...new Set([...serverTags, ...clientTags])];
};
