'use client';

import { useEffect } from 'react';

import { clientCache } from '@/cache/clientCache';
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
  timestamp: value.timestamp,
  clientRevalidate: value.clientRevalidate,
  clientTags: value.clientTags,
  serverTags: value.serverTags,
});

const hydrateClientCache = async (
  hydrationData: HydrationData
): Promise<number> => {
  try {
    const entries = Object.entries(hydrationData).map(([key, value]) =>
      createHydrationEntry(key, value)
    );

    const hydrationPromises = entries.map(
      async ({ key, data, clientRevalidate, clientTags, serverTags }) => {
        await clientCache.setWithTTL(
          key,
          data,
          clientRevalidate,
          clientTags,
          serverTags,
          'hydration'
        );
        return key;
      }
    );

    const hydratedKeys = await Promise.all(hydrationPromises);
    return hydratedKeys.length;
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
    window.__nextFetchClientCache = clientCache;
  }
};

const performHydration = async (): Promise<void> => {
  if (!isClientEnvironment()) return;

  const hydrationData = getHydrationData();
  if (!hydrationData) return;

  const hydratedCount = await hydrateClientCache(hydrationData);

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
