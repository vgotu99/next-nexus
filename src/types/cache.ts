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

export interface CacheEntry<T = any> {
  data: T;
  createdAt: number;
  expiresAt: number;
  tags: string[];
  etag?: string;
  key: string;
}

export interface CacheKeyOptions {
  endpoint: string;
  method?: string;
  params?: Record<string, any>;
  tags?: string[];
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

export type CacheScope = 'server+client' | 'serverOnly' | 'clientOnly';

export type CacheRevalidateTime = number | false;

export type CacheUtils = {
  generateKey: (options: CacheKeyOptions) => string;
  isExpired: (entry: CacheEntry) => boolean;
  calculateTTL: (revalidate?: number) => number;
  normalizeTags: (tags?: string[]) => string[];
};
