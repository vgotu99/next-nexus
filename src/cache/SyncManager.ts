import type { SyncResult, ServerCacheMetadata } from '@/types';
import { revalidationDetector } from './RevalidationDetector';
import { clientCacheManager } from './ClientCacheManager';

export class SyncManager {
  async handleSync(
    url: string,
    method: string,
    serverMetadata: ServerCacheMetadata,
    responseData: any,
    clientCacheConfig: any
  ): Promise<boolean> {
    try {
      const existingEntry = await clientCacheManager.get(url, method);

      const syncResult = revalidationDetector.detectRevalidation(
        serverMetadata.timestamp,
        existingEntry?.serverCacheTimestamp
      );

      if (syncResult.shouldUpdateClientCache) {
        await this.updateClientCache(
          url,
          method,
          responseData,
          serverMetadata,
          clientCacheConfig || this.extractClientConfigFromEntry(existingEntry)
        );

        if (
          syncResult.wasServerCacheUpdated &&
          process.env.NODE_ENV === 'development'
        ) {
          console.log(
            `[next-fetch] Server cache updated, client cache synchronized: ${url}`
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[next-fetch] Sync failed for ${url}:`, error);
      return false;
    }
  }

  private async updateClientCache(
    url: string,
    method: string,
    data: any,
    serverMetadata: ServerCacheMetadata,
    clientCacheConfig: any
  ): Promise<void> {
    const ttl = this.getClientCacheTTL(clientCacheConfig);
    const tags = this.mergeTags(
      serverMetadata.tags,
      clientCacheConfig.tags || []
    );

    await clientCacheManager.set(url, data, {
      method,
      ttl,
      tags,
      endpoint: url,
      serverCacheTimestamp: serverMetadata.timestamp,
    });
  }

  private getClientCacheTTL(clientCacheConfig: any): number {
    if (!clientCacheConfig || typeof clientCacheConfig === 'boolean') {
      return 300;
    }
    return clientCacheConfig.revalidate || 300;
  }

  private mergeTags(serverTags: string[], clientTags: string[]): string[] {
    return [...new Set([...serverTags, ...clientTags])];
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    if (typeof window === 'undefined') {
      console.warn('[next-fetch] Client cache invalidation skipped on server');
      return 0;
    }

    let totalInvalidated = 0;

    for (const tag of tags) {
      const count = await clientCacheManager.deleteByTag(tag);
      totalInvalidated += count;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[next-fetch] Invalidated ${totalInvalidated} cache entries by tags: ${tags.join(
          ', '
        )}`
      );
    }

    return totalInvalidated;
  }

  async invalidateByUrl(url: string, method: string = 'GET'): Promise<void> {
    await clientCacheManager.delete(url, method);
    console.log(`[SyncManager] Invalidated cache by URL: ${method} ${url}`);
  }

  private extractClientConfigFromEntry(entry: any): any {
    if (!entry) return {};

    return {
      revalidate: Math.floor((entry.expiresAt - entry.createdAt) / 1000),
      tags: entry.tags || [],
    };
  }
}

export const syncManager = new SyncManager();
