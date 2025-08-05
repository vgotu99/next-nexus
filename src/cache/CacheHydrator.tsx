'use client';

import { useEffect } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import type { HydrationData } from '@/types/cache';
import { isClientEnvironment, isDevelopment } from '@/utils/environmentUtils';

const getHydrationData = (): HydrationData | null => {
  try {
    return isClientEnvironment() && window.__NEXT_FETCH_HYDRATION__
      ? window.__NEXT_FETCH_HYDRATION__
      : null;
  } catch (error) {
    console.warn('Failed to parse hydration data:', error);

    return null;
  }
};

const cleanupHydrationResources = (): void => {
  try {
    if (!isClientEnvironment()) return;

    delete window.__NEXT_FETCH_HYDRATION__;

    const scriptElement = document.getElementById('__NEXT_FETCH_HYDRATION__');
    if (scriptElement) {
      scriptElement.remove();
    }
  } catch (error) {
    console.warn('Failed to cleanup hydration data:', error);
  }
};

const createHydrationEntry = (key: string, value: HydrationData[string]) => ({
  key,
  data: value.data,
  clientRevalidate: value.clientRevalidate,
  clientTags: value.clientTags,
  serverTags: value.serverTags,
  etag: value.etag,
  headers: value.headers,
});

const hydrateClientCache = (hydrationData: HydrationData): number => {
  try {
    const entries = Object.entries(hydrationData).map(([key, value]) =>
      createHydrationEntry(key, value)
    );

    entries.forEach(
      ({
        key,
        data,
        clientRevalidate,
        clientTags,
        serverTags,
        etag,
        headers,
      }) => {
        clientCacheStore.set(key, {
          data,
          clientRevalidate,
          clientTags,
          serverTags,
          source: 'hydration',
          etag,
          headers,
        });
      }
    );

    return entries.length;
  } catch (error) {
    return 0;
  }
};

const logHydrationResult = (count: number): void => {
  const shouldLog = count > 0 && isDevelopment();
  if (shouldLog) {
    console.log(`[NextFetch] Hydrated ${count} cache entries`);
  }
};

const setupDevelopmentDebug = (): void => {
  const canSetupDebug = isClientEnvironment() && isDevelopment();

  if (canSetupDebug) {
    window.__nextFetchClientCache = clientCacheStore;
  }
};

const performHydration = (): void => {
  if (!isClientEnvironment()) return;

  const hydrationData = getHydrationData();
  if (!hydrationData) return;

  const hydratedCount = hydrateClientCache(hydrationData);

  logHydrationResult(hydratedCount);
  cleanupHydrationResources();
  setupDevelopmentDebug();
};

const CacheHydrator = () => {
  useEffect(() => {
    performHydration();
  }, []);

  return null;
};

export default CacheHydrator;
