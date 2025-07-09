import type { SyncResult, ServerCacheMetadata } from "../types";
import { revalidationDetector } from "./RevalidationDetector";
import { clientCacheManager } from "./ClientCacheManager";

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
          clientCacheConfig
        );

        if (syncResult.wasServerCacheUpdated) {
          console.log(
            `[SyncManager] Server cache updated, client cache synced: ${url}`
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[SyncManager] Sync failed for ${url}:`, error);
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
    if (!clientCacheConfig || typeof clientCacheConfig === "boolean") {
      return 300;
    }
    return clientCacheConfig.revalidate || 300;
  }

  private mergeTags(serverTags: string[], clientTags: string[]): string[] {
    return [...new Set([...serverTags, ...clientTags])];
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await clientCacheManager.deleteByTag(tag);
    }
    console.log(`[SyncManager] Invalidated cache by tags: ${tags.join(", ")}`);
  }

  async invalidateByUrl(url: string, method: string = "GET"): Promise<void> {
    await clientCacheManager.delete(url, method);
    console.log(`[SyncManager] Invalidated cache by URL: ${method} ${url}`);
  }
}

export const syncManager = new SyncManager();
