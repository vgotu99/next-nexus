export interface ClientCacheOptions {
  revalidate?: number;
  tags?: string[];
  syncWithServer?: boolean;
}

export type ClientCache = ClientCacheOptions | boolean;

export interface CacheEntry {
  data: any;
  createdAt: number;
  expiresAt: number;
  tags: string[];
  endpoint: string;
  fullURL: string;
  method: string;
  serverRevalidateInterval?: number;
  serverCacheTimestamp?: string;
}

export interface CacheEntryMethods {
  isExpired(): boolean;
  isServerCacheExpired(): boolean;
}

export type FullCacheEntry = CacheEntry & CacheEntryMethods;

export interface RequestCacheItem {
  endpoint: string;
  fullURL: string;
  data: any;
  method: string;
  config: any;
  timestamp: number;
  tags: string[];
  serverCacheTimestamp?: string;
}

export interface RevalidationInfo {
  wasRevalidated: boolean;
  timestamp?: number;
  nextRevalidateAt?: number;
}

export interface CacheStatus {
  hit: boolean;
  age?: number;
  responseTime?: number;
  serverCacheStatus?: "HIT" | "MISS" | "STALE";
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
