import type { CacheConfig, CacheMetrics } from '@/types';
import { cacheOptimizer } from './CacheOptimizer';

export const configureCacheSettings = (config: Partial<CacheConfig>): void => {
  cacheOptimizer.updateConfig(config);

  if (process.env.NODE_ENV === 'development') {
    console.log('[next-fetch] Cache settings updated:', config);
  }
};

export const getCacheMetrics = (): CacheMetrics => {
  return cacheOptimizer.getMetrics();
};

export const triggerCacheCleanup = async (): Promise<number> => {
  try {
    return await cacheOptimizer.performCleanup();
  } catch (error) {
    console.error('[next-fetch] Manual cache cleanup failed:', error);
    return 0;
  }
};

export const checkStorageQuota = async (): Promise<boolean> => {
  return await cacheOptimizer.checkStorageQuota();
};

export const getDefaultCacheConfig = (): Required<CacheConfig> => {
  return {
    maxEntries: 1000,
    maxStorageSize: 50 * 1024 * 1024,
    cleanupInterval: 5 * 60 * 1000,
    batchSize: 50,
    enableMetrics: true,
    metricsInterval: 60 * 1000,
    enableGracefulDegradation: true,
    retryAttempts: 3,
    retryDelay: 1000,
  };
};
