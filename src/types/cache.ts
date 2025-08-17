export interface ServerCacheOptions {
  revalidate?: number;
  tags?: string[];
}

export interface ClientCacheOptions {
  revalidate?: number;
  tags?: string[];
  cachedHeaders?: string[];
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
  clientRevalidate?: number;
  clientTags?: string[];
  serverTags?: string[];
}

export interface CacheKeyOptions {
  endpoint: string;
  method?: string;
  clientTags?: string[];
  serverTags?: string[];
}

export interface ClientCacheEntry<T = unknown> extends CacheEntry<T> {
  source: 'fetch' | 'hydration' | 'manual';
  headers?: Record<string, string>;
}

export interface ClientCacheState {
  clientCache: Map<string, ClientCacheEntry>;
  tagIndex: Map<string, Set<string>>;
  maxSize: number;
}

export type CacheRevalidateTime = number | false;

export interface HydrationData {
  [cacheKey: string]: Omit<
    ClientCacheEntry,
    'key' | 'createdAt' | 'expiresAt' | 'source'
  >;
}

export type ClientCacheMetadata = Omit<CacheEntry, 'data' | 'createdAt'> & {
  cacheKey: string;
};

export interface CacheHandler<TData = unknown> {
  get(): TData | undefined;
  set(updater: (oldData: TData | undefined) => TData): void;
  remove(): void;
  invalidate(): void;
  isStale(): boolean;
  subscribe(callback: (data: TData | undefined) => void): () => void;
}

export type ExtendTTLData = Record<string, number>;
