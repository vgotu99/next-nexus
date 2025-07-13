export interface ClientCacheOptions {
  revalidate?: number;
  tags?: string[];
  syncWithServer?: boolean;
}

export type ClientCache = ClientCacheOptions | boolean;

export interface CacheStatus {
  hit: boolean;
  age?: number;
  responseTime?: number;
  serverCacheStatus?: 'HIT' | 'MISS' | 'STALE';
}
