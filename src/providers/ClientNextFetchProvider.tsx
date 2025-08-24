'use client';

import { useEffect } from 'react';

import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import NextFetchClientInitializer from '@/core/NextFetchClientInitializer';
import type { NextFetchProviderProps } from '@/providers/NextFetchProvider';
import type { NextFetchPayload } from '@/types/payload';
import { isClientEnvironment, isDevelopment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';

const getNextFetchPayload = (): NextFetchPayload | null => {
  if (!isClientEnvironment() || !window.__NEXT_FETCH_PAYLOAD__) {
    return null;
  }

  try {
    return window.__NEXT_FETCH_PAYLOAD__;
  } catch (error) {
    logger.warn('[Provider] Failed to parse hydration payload', error);
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
      logger.warn(`[Provider] Failed to extend TTL for key ${key}`, error);
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
    logger.warn('[Provider] Failed to cleanup resources', error);
  }
};

const logInitializationResult = (
  hydratedCount: number,
  extendedCount: number
): void => {
  if (!isDevelopment()) return;

  const totalOperations = hydratedCount + extendedCount;

  if (totalOperations > 0) {
    logger.info(`[Provider] Initialized - Hydrated: ${hydratedCount}, Extended: ${extendedCount}`);
  }
};


export const initNextFetchClient = (): void => {
  try {
    const payload = getNextFetchPayload();

    if (!payload) {
      return;
    }

    const hydratedCount = hydrateClientCache(payload.hydrationData);
    const extendedCount = applyTTLExtensions(payload.notModifiedKeys);

    logInitializationResult(hydratedCount, extendedCount);
    cleanupResources();
  } catch (error) {
    logger.error('[Provider] Client initialization failed', error);
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
