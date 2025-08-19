'use client';

import { useEffect } from 'react';

import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import NextFetchClientInitializer from '@/core/NextFetchClientInitializer';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';
import type { NextFetchPayload } from '@/types/payload';
import { isClientEnvironment, isDevelopment } from '@/utils/environmentUtils';

const getNextFetchPayload = (): NextFetchPayload | null => {
  if (!isClientEnvironment() || !window.__NEXT_FETCH_PAYLOAD__) {
    return null;
  }

  try {
    return window.__NEXT_FETCH_PAYLOAD__;
  } catch (error) {
    console.warn('[next-fetch] Failed to parse payload:', error);
    return null;
  }
};

const hydrateClientCache = (
  hydrationData: NextFetchPayload['hydrationData']
): number => {
  const entries = Object.entries(hydrationData);

  entries.forEach(([key, value]) => {
    clientCacheStore.set(key, {
      data: value.data,
      clientRevalidate: value.clientRevalidate,
      clientTags: value.clientTags,
      serverTags: value.serverTags,
      source: 'hydration',
      etag: value.etag,
      headers: value.headers,
    });
  });

  return entries.length;
};

const applyTTLExtensions = (notModifiedKeys: readonly string[]): number => {
  const processedCount = notModifiedKeys.filter(key => {
    try {
      const entry = clientCacheStore.get(key);

      if (entry?.clientRevalidate && entry.clientRevalidate > 0) {
        extendCacheEntryTTL(key, entry.clientRevalidate);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[next-fetch] Failed to extend TTL for key ${key}:`, error);
      return false;
    }
  }).length;

  return processedCount;
};

const cleanupResources = (): void => {
  try {
    delete window.__NEXT_FETCH_PAYLOAD__;

    const scriptElement = document.getElementById('__NEXT_FETCH_SCRIPT__');
    scriptElement?.remove();
  } catch (error) {
    console.warn('[next-fetch] Failed to cleanup resources:', error);
  }
};

const logInitializationResult = (
  hydratedCount: number,
  extendedCount: number
): void => {
  if (!isDevelopment()) return;

  const totalOperations = hydratedCount + extendedCount;

  if (totalOperations > 0) {
    console.log(
      `[next-fetch] Initialized - Hydrated: ${hydratedCount}, Extended: ${extendedCount}`
    );
  }
};

const setupDevelopmentDebug = (): void => {
  if (isClientEnvironment() && isDevelopment()) {
    window.__nextFetchClientCache = clientCacheStore;
  }
};

export const initNextFetchClient = (): void => {
  try {
    const payload = getNextFetchPayload();

    if (!payload) {
      setupDevelopmentDebug();
      return;
    }

    const hydratedCount = hydrateClientCache(payload.hydrationData);
    const extendedCount = applyTTLExtensions(payload.notModifiedKeys);

    logInitializationResult(hydratedCount, extendedCount);
    cleanupResources();
    setupDevelopmentDebug();
  } catch (error) {
    console.error('[next-fetch] Client initialization failed:', error);
  }
};

const ClientNextFetchProvider = ({
  children,
  maxSize,
}: NextFetchProviderProps) => {
  useEffect(() => {
    if (maxSize) {
      clientCacheStore.setMaxSize(maxSize);
    }

    initNextFetchClient();
  }, [maxSize]);

  return <NextFetchClientInitializer>{children}</NextFetchClientInitializer>;
};

export default ClientNextFetchProvider;
