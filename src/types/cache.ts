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

export interface ClientRevalidateResult {
  success: boolean;
  invalidatedCount: number;
  tags: string[];
  errors?: string[];
}

export interface CacheConfig {
  maxEntries?: number;
  maxStorageSize?: number;
  cleanupInterval?: number;
  batchSize?: number;
  enableMetrics?: boolean;
  metricsInterval?: number;
  enableGracefulDegradation?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastCleanup: number;
  quotaUsage: number;
}

export interface CachePerformanceEntry {
  operation: "get" | "set" | "delete" | "cleanup";
  duration: number;
  success: boolean;
  cacheKey?: string;
  timestamp: number;
  error?: string;
}

export interface GracefulDegradationOptions {
  fallbackToNetwork: boolean;
  fallbackToStale: boolean;
  logErrors: boolean;
  reportMetrics: boolean;
}
