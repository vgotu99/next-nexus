import type { CacheEntry, FullCacheEntry } from "@/types";
import { CacheError } from "@/errors/CacheError";
import { cacheOptimizer } from "./CacheOptimizer";

export class ClientCacheManager {
  private readonly cacheStorageName = "next-fetch-cache";
  private readonly metadataPrefix = "__metadata__";

  private async getCacheStorage(): Promise<Cache> {
    if (typeof window === "undefined") {
      throw CacheError.unavailable(
        "ClientCacheManager can only be used in browser environment"
      );
    }

    if (!("caches" in window)) {
      throw CacheError.unsupported(
        "Cache Storage API is not supported in this browser"
      );
    }

    try {
      return await caches.open(this.cacheStorageName);
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        throw CacheError.quotaExceeded("Cache storage quota exceeded");
      }
      throw CacheError.unavailable("Failed to open cache storage");
    }
  }

  private getCacheKey(fullURL: string, method: string = "GET"): string {
    return `${method.toUpperCase()}:${fullURL}`;
  }

  private getMetadataKey(cacheKey: string): string {
    return `${this.metadataPrefix}${cacheKey}`;
  }

  private createFullCacheEntry(entry: CacheEntry): FullCacheEntry {
    return {
      ...entry,
      isExpired: () => Date.now() > entry.expiresAt,
      isServerCacheExpired: () => {
        if (!entry.serverRevalidateInterval) return false;
        return (
          Date.now() - entry.createdAt > entry.serverRevalidateInterval * 1000
        );
      },
    };
  }

  async set(
    fullURL: string,
    data: any,
    options: {
      method?: string;
      ttl?: number;
      tags?: string[];
      endpoint?: string;
      serverRevalidateInterval?: number;
      serverCacheTimestamp?: string;
    } = {}
  ): Promise<void> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(fullURL, options.method || "GET");

    const result = await cacheOptimizer.handleGracefulDegradation(
      async () => {
        // Check storage quota before attempting to store
        const hasQuota = await cacheOptimizer.checkStorageQuota();
        if (!hasQuota) {
          // Trigger cleanup and retry
          await cacheOptimizer.performCleanup();

          const hasQuotaAfterCleanup = await cacheOptimizer.checkStorageQuota();
          if (!hasQuotaAfterCleanup) {
            throw CacheError.quotaExceeded(
              "Storage quota exceeded even after cleanup"
            );
          }
        }

        const cache = await this.getCacheStorage();
        const {
          method = "GET",
          ttl = 300,
          tags = [],
          endpoint = fullURL,
          serverRevalidateInterval,
          serverCacheTimestamp,
        } = options;

        const now = Date.now();

        const cacheEntry: CacheEntry = {
          data,
          createdAt: now,
          expiresAt: now + ttl * 1000,
          tags,
          endpoint,
          fullURL,
          method: method.toUpperCase(),
          serverRevalidateInterval,
          serverCacheTimestamp,
        };

        const dataResponse = new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Timestamp": now.toString(),
            "X-Cache-TTL": ttl.toString(),
            "X-Cache-Tags": tags.join(","),
          },
        });

        const metadataResponse = new Response(JSON.stringify(cacheEntry), {
          headers: {
            "Content-Type": "application/json",
          },
        });

        try {
          await Promise.all([
            cache.put(cacheKey, dataResponse),
            cache.put(this.getMetadataKey(cacheKey), metadataResponse),
          ]);

          cacheOptimizer.recordPerformance("set", startTime, true, cacheKey);

          if (process.env.NODE_ENV === "development") {
            console.log(
              `ClientCache: Stored ${method} ${fullURL} (TTL: ${ttl}s)`
            );
          }
        } catch (error) {
          cacheOptimizer.recordPerformance(
            "set",
            startTime,
            false,
            cacheKey,
            error instanceof Error ? error.message : String(error)
          );

          if (error instanceof Error && error.name === "QuotaExceededError") {
            throw CacheError.quotaExceeded(
              "Failed to store cache entry: quota exceeded"
            );
          }
          throw CacheError.operationFailed(
            "Failed to store cache entry",
            error as Error
          );
        }
      },
      {
        fallbackToNetwork: false,
        logErrors: true,
      }
    );

    if (result === null) {
      throw CacheError.operationFailed(
        "Cache set operation failed after all retries"
      );
    }
  }

  async get(
    fullURL: string,
    method: string = "GET"
  ): Promise<FullCacheEntry | null> {
    try {
      const cache = await this.getCacheStorage();
      const cacheKey = this.getCacheKey(fullURL, method);
      const metadataKey = this.getMetadataKey(cacheKey);
      const metadataResponse = await cache.match(metadataKey);

      if (!metadataResponse) {
        return null;
      }

      const cacheEntry: CacheEntry = await metadataResponse.json();
      const fullEntry = this.createFullCacheEntry(cacheEntry);

      if (fullEntry.isExpired()) {
        await this.delete(fullURL, method);
        return null;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`🎯 ClientCache: Hit ${method} ${fullURL}`);
      }

      return fullEntry;
    } catch (error) {
      console.error("Failed to get cache:", error);
      return null;
    }
  }

  async delete(fullURL: string, method: string = "GET"): Promise<boolean> {
    try {
      const cache = await this.getCacheStorage();
      const cacheKey = this.getCacheKey(fullURL, method);
      const metadataKey = this.getMetadataKey(cacheKey);

      const results = await Promise.all([
        cache.delete(cacheKey),
        cache.delete(metadataKey),
      ]);

      if (process.env.NODE_ENV === "development") {
        console.log(`ClientCache: Deleted ${method} ${fullURL}`);
      }

      return results[0] || results[1];
    } catch (error) {
      console.error("Failed to delete cache:", error);
      return false;
    }
  }

  async getByTag(tag: string): Promise<FullCacheEntry[]> {
    try {
      const cache = await this.getCacheStorage();
      const keys = await cache.keys();
      const entries: FullCacheEntry[] = [];

      for (const request of keys) {
        if (request.url.includes(this.metadataPrefix)) {
          const response = await cache.match(request);
          if (response) {
            const cacheEntry: CacheEntry = await response.json();
            if (cacheEntry.tags?.includes(tag)) {
              const fullEntry = this.createFullCacheEntry(cacheEntry);
              if (!fullEntry.isExpired()) {
                entries.push(fullEntry);
              } else {
                await this.delete(cacheEntry.fullURL, cacheEntry.method);
              }
            }
          }
        }
      }

      return entries;
    } catch (error) {
      console.error("Failed to get cache by tag:", error);
      return [];
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    try {
      const entries = await this.getByTag(tag);
      let deletedCount = 0;

      for (const entry of entries) {
        const success = await this.delete(entry.fullURL, entry.method);
        if (success) deletedCount++;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🗑️ ClientCache: Deleted ${deletedCount} entries with tag "${tag}"`
        );
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to delete cache by tag:", error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        await caches.delete(this.cacheStorageName);

        if (process.env.NODE_ENV === "development") {
          console.log("🗑️ ClientCache: Cleared all cache");
        }
      }
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }

  async cleanup(): Promise<number> {
    try {
      const cache = await this.getCacheStorage();
      const keys = await cache.keys();
      let cleanedCount = 0;

      for (const request of keys) {
        if (request.url.includes(this.metadataPrefix)) {
          const response = await cache.match(request);
          if (response) {
            const cacheEntry: CacheEntry = await response.json();
            const fullEntry = this.createFullCacheEntry(cacheEntry);

            if (fullEntry.isExpired()) {
              await this.delete(cacheEntry.fullURL, cacheEntry.method);
              cleanedCount++;
            }
          }
        }
      }

      if (process.env.NODE_ENV === "development" && cleanedCount > 0) {
        console.log(`ClientCache: Cleaned up ${cleanedCount} expired entries`);
      }

      return cleanedCount;
    } catch (error) {
      console.error("Failed to cleanup cache:", error);
      return 0;
    }
  }
}

export const clientCacheManager = new ClientCacheManager();
