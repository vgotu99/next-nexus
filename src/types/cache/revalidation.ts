export interface RevalidationInfo {
  wasRevalidated: boolean;
  timestamp?: number;
  nextRevalidateAt?: number;
}

export interface ServerCacheMetadata {
  timestamp: string;
  tags: string[];
}

export interface SyncResult {
  wasServerCacheUpdated: boolean;
  shouldUpdateClientCache: boolean;
  newServerTimestamp?: string;
}

export interface ClientRevalidateResult {
  success: boolean;
  invalidatedCount: number;
  tags: string[];
  errors?: string[];
}
