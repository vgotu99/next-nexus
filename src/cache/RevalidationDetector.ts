import type { ServerCacheMetadata, SyncResult } from '@/types';

export class RevalidationDetector {
  extractServerCacheMetadata(response: Response): ServerCacheMetadata | null {
    const timestamp = response.headers.get('x-server-cache-timestamp');
    const tags = response.headers.get('x-server-cache-tags');

    if (!timestamp) {
      return null;
    }

    return {
      timestamp,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    };
  }

  detectRevalidation(
    currentServerTimestamp: string,
    storedServerTimestamp?: string
  ): SyncResult {
    if (!storedServerTimestamp) {
      return {
        wasServerCacheUpdated: false,
        shouldUpdateClientCache: true,
        newServerTimestamp: currentServerTimestamp,
      };
    }

    const wasUpdated = currentServerTimestamp !== storedServerTimestamp;

    return {
      wasServerCacheUpdated: wasUpdated,
      shouldUpdateClientCache: wasUpdated,
      newServerTimestamp: wasUpdated ? currentServerTimestamp : undefined,
    };
  }

  generateCacheTimestamp(): string {
    return Date.now().toString();
  }
}

export const revalidationDetector = new RevalidationDetector();
