export interface ServerCacheOptions {
  revalidate?: CacheRevalidateTime;
  tags?: string[];
}

export interface ClientCacheOptions {
  revalidate?: number;
  tags?: string[];
  shareServerTags?: boolean;
}

export interface CacheOptions {
  server?: ServerCacheOptions;
  client?: ClientCacheOptions;
}

export interface CacheEntry<T = unknown> {
  data: T;
  createdAt: number;
  expiresAt: number;
  etag?: string;
  key: string;
  clientRevalidate?: number;
  clientTags?: string[];
  serverTags?: string[];
}

export interface CacheKeyOptions {
  endpoint: string;
  method?: string;
  params?: Record<string, any>;
  clientTags?: string[];
  serverTags?: string[];
}

export interface CacheInvalidationOptions {
  tags?: string[];
  path?: string;
  scope?: CacheScope;
}

export interface CacheStorage<T = any> {
  get(key: string): Promise<CacheEntry<T> | null>;
  set(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  invalidateByTags(tags: string[]): Promise<void>;
}

export interface CacheManagerConfig {
  maxSize?: number;
  defaultTTL?: number;
  storage?: CacheStorage;
  debug?: boolean;
}

export interface ClientCacheEntry<T = unknown> extends CacheEntry<T> {
  source: 'fetch' | 'hydration' | 'manual';
  lastAccessed: number;
}

export interface ClientCacheState {
  clientCache: Map<string, ClientCacheEntry>;
  maxSize: number;
  defaultTTL: number;
}

export type CacheScope = 'server+client' | 'serverOnly' | 'clientOnly';

export type CacheRevalidateTime = number | false;

export type CacheUtils = {
  generateCacheKey: (options: CacheKeyOptions) => string;
  isCacheEntryExpired: (entry: CacheEntry) => boolean;
  calculateCacheTTL: (revalidate?: CacheRevalidateTime) => number;
  normalizeCacheTags: (tags?: string[]) => string[];
};

export interface HydrationData {
  [cacheKey: string]: {
    data: unknown;
    timestamp: number;
    clientRevalidate?: number;
    clientTags?: string[];
    serverTags?: string[];
  };
}

export type ClientCacheMetadata = Omit<
  CacheEntry,
  'data' | 'createdAt' | 'clientRevalidate'
>;

export interface SerializedCacheState {
  metadata: ClientCacheMetadata[];
  timestamp: number;
}
