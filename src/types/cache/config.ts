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
  operation: 'get' | 'set' | 'delete' | 'cleanup';
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
