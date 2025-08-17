'use client';

import { useEffect } from 'react';

import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import type { ExtendTTLData, HydrationData } from '@/types/cache';
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

const getExtendTTLData = (): ExtendTTLData | null => {
  try {
    return isClientEnvironment() && window.__NEXT_FETCH_EXTEND_TTL__
      ? window.__NEXT_FETCH_EXTEND_TTL__
      : null;
  } catch (error) {
    console.warn('Failed to parse extend TTL data:', error);
    return null;
  }
};

const cleanupExtendTTLResources = (): void => {
  try {
    if (!isClientEnvironment()) return;

    delete window.__NEXT_FETCH_EXTEND_TTL__;

    const scriptElement = document.getElementById('__NEXT_FETCH_EXTEND_TTL__');
    if (scriptElement) {
      scriptElement.remove();
    }
  } catch (error) {
    console.warn('Failed to cleanup extend TTL data:', error);
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

const applyExtendTTL = (extendData: ExtendTTLData): number => {
  try {
    const items = Object.entries(extendData);
    items.forEach(([key, seconds]) => {
      if (seconds > 0) {
        extendCacheEntryTTL(key, seconds);
      }
    });
    return items.length;
  } catch (error) {
    return 0;
  }
};

const logHydrationResult = (count: number): void => {
  const shouldLog = count > 0 && isDevelopment();
  if (shouldLog) {
    console.warn(`[NextFetch] Hydrated ${count} cache entries`);
  }
};

const logExtendTTLResult = (count: number): void => {
  const shouldLog = count > 0 && isDevelopment();
  if (shouldLog) {
    console.warn(`[NextFetch] Extended TTL for ${count} entries`);
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
  const extendTTLData = getExtendTTLData();

  if (hydrationData) {
    const hydratedCount = hydrateClientCache(hydrationData);
    logHydrationResult(hydratedCount);
    cleanupHydrationResources();
  }

  if (extendTTLData) {
    const extendedCount = applyExtendTTL(extendTTLData);
    logExtendTTLResult(extendedCount);
    cleanupExtendTTLResources();
  }

  setupDevelopmentDebug();
};

const CacheHydrator = () => {
  useEffect(() => {
    performHydration();
  }, []);

  return null;
};

export default CacheHydrator;
