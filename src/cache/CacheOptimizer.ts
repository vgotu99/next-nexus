import type {
  CacheConfig,
  CacheMetrics,
  CachePerformanceEntry,
  GracefulDegradationOptions,
} from '@/types';
import { CacheError } from '@/errors/CacheError';

export class CacheOptimizer {
  private config: Required<CacheConfig>;
  private metrics: CacheMetrics;
  private performanceHistory: CachePerformanceEntry[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private isCleanupRunning = false;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      maxStorageSize: config.maxStorageSize ?? 50 * 1024 * 1024,
      cleanupInterval: config.cleanupInterval ?? 5 * 60 * 1000,
      batchSize: config.batchSize ?? 50,
      enableMetrics: config.enableMetrics ?? true,
      metricsInterval: config.metricsInterval ?? 60 * 1000,
      enableGracefulDegradation: config.enableGracefulDegradation ?? true,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    this.metrics = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastCleanup: Date.now(),
      quotaUsage: 0,
    };

    this.startSchedulers();
  }

  private startSchedulers(): void {
    if (typeof window === 'undefined') return;

    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch(error => {
        console.warn('[next-fetch] Auto-cleanup failed:', error);
      });
    }, this.config.cleanupInterval);

    if (this.config.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.collectMetrics().catch(error => {
          console.warn('[next-fetch] Metrics collection failed:', error);
        });
      }, this.config.metricsInterval);
    }
  }

  async performCleanup(): Promise<number> {
    if (this.isCleanupRunning) return 0;

    this.isCleanupRunning = true;
    const startTime = performance.now();
    let cleanedCount = 0;

    try {
      if (typeof window === 'undefined' || !('caches' in window)) {
        return 0;
      }

      const cache = await caches.open('next-fetch-cache');
      const keys = await cache.keys();
      const metadataKeys = keys.filter(key => key.url.includes('__metadata__'));

      for (let i = 0; i < metadataKeys.length; i += this.config.batchSize) {
        const batch = metadataKeys.slice(i, i + this.config.batchSize);
        cleanedCount += await this.processBatch(cache, batch);
      }

      this.metrics.lastCleanup = Date.now();

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[next-fetch] Cleanup completed: ${cleanedCount} expired entries removed`
        );
      }

      return cleanedCount;
    } catch (error) {
      this.recordPerformance(
        'cleanup',
        startTime,
        false,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
      throw CacheError.operationFailed(
        'Cleanup operation failed',
        error as Error
      );
    } finally {
      this.isCleanupRunning = false;
    }
  }

  private async processBatch(cache: Cache, keys: Request[]): Promise<number> {
    let batchCleanedCount = 0;

    for (const key of keys) {
      try {
        const response = await cache.match(key);
        if (!response) continue;

        const metadata = await response.json();
        const isExpired = Date.now() > metadata.expiresAt;

        if (isExpired) {
          const cacheKey = key.url.replace('__metadata__', '');
          await Promise.all([cache.delete(key), cache.delete(cacheKey)]);
          batchCleanedCount++;
        }
      } catch (error) {
        console.warn('[next-fetch] Failed to process cache entry:', error);
      }
    }

    return batchCleanedCount;
  }

  async collectMetrics(): Promise<CacheMetrics> {
    const startTime = performance.now();

    try {
      if (typeof window === 'undefined' || !('caches' in window)) {
        return this.metrics;
      }

      const cache = await caches.open('next-fetch-cache');
      const keys = await cache.keys();

      let totalSize = 0;
      let validEntries = 0;

      for (const key of keys) {
        try {
          const response = await cache.match(key);
          if (response) {
            const text = await response.text();
            totalSize += new Blob([text]).size;
            validEntries++;
          }
        } catch (error) {
          console.warn(
            '[next-fetch] Failed to calculate cache entry size:',
            error
          );
        }
      }

      const recentEntries = this.performanceHistory.slice(-100);
      const getOperations = recentEntries.filter(
        entry => entry.operation === 'get'
      );
      const hits = getOperations.filter(entry => entry.success).length;
      const hitRate =
        getOperations.length > 0 ? hits / getOperations.length : 0;

      const avgResponseTime =
        getOperations.length > 0
          ? getOperations.reduce((sum, entry) => sum + entry.duration, 0) /
            getOperations.length
          : 0;

      const errors = recentEntries.filter(entry => !entry.success).length;
      const errorRate =
        recentEntries.length > 0 ? errors / recentEntries.length : 0;

      const quotaUsage = Math.min(totalSize / this.config.maxStorageSize, 1);

      this.metrics = {
        totalEntries: validEntries,
        totalSize,
        hitRate,
        averageResponseTime: avgResponseTime,
        errorRate,
        lastCleanup: this.metrics.lastCleanup,
        quotaUsage,
      };

      this.recordPerformance('cleanup', startTime, true);
      return this.metrics;
    } catch (error) {
      this.recordPerformance(
        'cleanup',
        startTime,
        false,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
      throw CacheError.operationFailed(
        'Metrics collection failed',
        error as Error
      );
    }
  }

  recordPerformance(
    operation: CachePerformanceEntry['operation'],
    startTime: number,
    success: boolean,
    cacheKey?: string,
    error?: string
  ): void {
    if (!this.config.enableMetrics) return;

    const entry: CachePerformanceEntry = {
      operation,
      duration: performance.now() - startTime,
      success,
      cacheKey,
      timestamp: Date.now(),
      error,
    };

    this.performanceHistory.push(entry);

    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  async checkStorageQuota(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !navigator.storage?.estimate) {
        return true;
      }

      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || Infinity;

      const usageRatio = used / quota;

      if (usageRatio > 0.9) {
        console.warn(
          '[next-fetch] Storage quota nearly exceeded:',
          `${Math.round(usageRatio * 100)}% used`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.warn('[next-fetch] Failed to check storage quota:', error);
      return true;
    }
  }

  async handleGracefulDegradation<T>(
    operation: () => Promise<T>,
    options: Partial<GracefulDegradationOptions> = {}
  ): Promise<T | null> {
    if (!this.config.enableGracefulDegradation) {
      return await operation();
    }

    const {
      fallbackToNetwork = true,
      fallbackToStale = true,
      logErrors = true,
      reportMetrics = true,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (logErrors && attempt === 0) {
          console.warn(
            `[next-fetch] Cache operation failed (attempt ${attempt + 1}):`,
            error
          );
        }

        if (attempt < this.config.retryAttempts - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.config.retryDelay)
          );
        }
      }
    }

    if (logErrors) {
      console.error(
        '[next-fetch] Cache operation failed after all retries:',
        lastError
      );
    }

    if (reportMetrics) {
      this.recordPerformance('get', 0, false, undefined, lastError?.message);
    }

    return null;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.cleanupInterval || newConfig.metricsInterval) {
      this.stopSchedulers();
      this.startSchedulers();
    }
  }

  stopSchedulers(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }

  destroy(): void {
    this.stopSchedulers();
    this.performanceHistory = [];
  }
}

export const cacheOptimizer = new CacheOptimizer();
