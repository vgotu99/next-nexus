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
