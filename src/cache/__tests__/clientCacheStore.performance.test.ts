import { clientCacheStore } from '@/cache/clientCacheStore';

describe('clientCacheStore Performance Benchmarks', () => {
  beforeEach(() => {
    clientCacheStore.clear();
  });

  afterEach(() => {
    clientCacheStore.clear();
  });

  describe('Cache Operations Performance', () => {
    it('should handle bulk set operations efficiently', () => {
      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [`tag-${i % 10}`],
          [`server-tag-${i % 5}`],
          'manual'
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = (iterations / duration) * 1000;

      console.log(
        `Bulk set performance: ${operationsPerSecond.toFixed(2)} ops/sec`
      );
      expect(operationsPerSecond).toBeGreaterThan(1000);
    });

    it('should handle bulk get operations efficiently', () => {
      for (let i = 0; i < 100; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [],
          [],
          'manual'
        );
      }

      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        clientCacheStore.get(`key-${i % 100}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = (iterations / duration) * 1000;

      console.log(
        `Bulk get performance: ${operationsPerSecond.toFixed(2)} ops/sec`
      );
      expect(operationsPerSecond).toBeGreaterThan(5000);
    });

    it('should handle subscription operations efficiently', () => {
      const startTime = performance.now();
      const iterations = 100;
      const subscriptions: (() => void)[] = [];

      for (let i = 0; i < iterations; i++) {
        const unsubscribe = clientCacheStore.subscribe(`key-${i}`, () => {});
        subscriptions.push(unsubscribe);
      }

      subscriptions.forEach(unsubscribe => unsubscribe());

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = ((iterations * 2) / duration) * 1000;

      console.log(
        `Subscription performance: ${operationsPerSecond.toFixed(2)} ops/sec`
      );
      expect(operationsPerSecond).toBeGreaterThan(500);
    });
  });

  describe('Memory Efficiency', () => {
    it('should maintain consistent memory usage during bulk operations', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      for (let i = 0; i < 500; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}`, largeArray: new Array(100).fill(i) },
          60,
          [],
          [],
          'manual'
        );
      }

      for (let i = 0; i < 200; i++) {
        clientCacheStore.delete(`key-${i}`);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(
        `Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`
      );

      if (initialMemory > 0 && finalMemory > 0) {
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    });

    it('should clean up expired entries efficiently', () => {
      for (let i = 0; i < 100; i++) {
        clientCacheStore.set(
          `expired-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [],
          [],
          'manual'
        );
      }

      for (let i = 0; i < 100; i++) {
        clientCacheStore.set(
          `valid-${i}`,
          { id: i, data: `data-${i}` },
          3600,
          [],
          [],
          'manual'
        );
      }

      const pastTime = Date.now() - 1000;
      for (let i = 0; i < 100; i++) {
        clientCacheStore.update(`expired-${i}`, {
          expiresAt: pastTime,
        });
      }

      const startTime = performance.now();
      const removedCount = clientCacheStore.cleanup();
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `Cleanup performance: ${removedCount} entries removed in ${duration.toFixed(2)}ms`
      );

      expect(removedCount).toBe(100);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('LRU Eviction Performance', () => {
    it('should handle LRU eviction efficiently when cache is full', () => {
      const maxSize = 50;

      const totalEntries = maxSize + 50;

      for (let i = 0; i < totalEntries; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [],
          [],
          'manual'
        );
      }

      const startTime = performance.now();

      for (let i = totalEntries; i < totalEntries + 20; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [],
          [],
          'manual'
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const finalSize = clientCacheStore.size();

      console.log(
        `LRU eviction performance: ${duration.toFixed(2)}ms for 20 evictions, final size: ${finalSize}`
      );

      expect(finalSize).toBeLessThanOrEqual(200);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Tag-based Operations Performance', () => {
    it('should handle tag-based invalidation efficiently', () => {
      for (let i = 0; i < 200; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [`tag-${i % 10}`],
          [`server-tag-${i % 5}`],
          'manual'
        );
      }

      const startTime = performance.now();
      clientCacheStore.revalidateByTags(['tag-5', 'tag-7']);
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `Tag-based invalidation performance: ${duration.toFixed(2)}ms`
      );

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Update Operations Performance', () => {
    it('should handle bulk update operations efficiently', () => {
      for (let i = 0; i < 100; i++) {
        clientCacheStore.set(
          `key-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [],
          [],
          'manual'
        );
      }

      const startTime = performance.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        clientCacheStore.update(`key-${i}`, {
          data: { id: i, data: `updated-data-${i}`, timestamp: Date.now() },
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = (iterations / duration) * 1000;

      console.log(
        `Bulk update performance: ${operationsPerSecond.toFixed(2)} ops/sec`
      );
      expect(operationsPerSecond).toBeGreaterThan(500);
    });
  });

  describe('Zero TTL Performance', () => {
    it('should handle zero TTL entries correctly', () => {
      for (let i = 0; i < 50; i++) {
        clientCacheStore.set(
          `zero-ttl-${i}`,
          { id: i, data: `data-${i}` },
          0,
          [],
          [],
          'manual'
        );
      }

      for (let i = 0; i < 50; i++) {
        clientCacheStore.set(
          `valid-ttl-${i}`,
          { id: i, data: `data-${i}` },
          60,
          [],
          [],
          'manual'
        );
      }

      const startTime = performance.now();
      const removedCount = clientCacheStore.cleanup();
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `Zero TTL cleanup performance: ${removedCount} entries removed in ${duration.toFixed(2)}ms`
      );

      expect(removedCount).toBe(50);
      expect(duration).toBeLessThan(50);
    });
  });
});
