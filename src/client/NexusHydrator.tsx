'use client';

import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import type { NexusProviderProps } from '@/providers/NexusProvider';
import type { NexusPayload } from '@/types/payload';
import { isCacheEntryExpired } from '@/utils/cacheUtils';
import { isDevelopment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';

const hydrateEntry = (
  key: string,
  value: NexusPayload['hydrationData'][string]
) => {
  const existing = clientCacheStore.get(key);

  if (existing && !isCacheEntryExpired(existing)) return;

  clientCacheStore.set(key, {
    data: value.data,
    clientRevalidate: value.clientRevalidate,
    clientTags: value.clientTags,
    serverTags: value.serverTags,
    source: 'hydration',
    etag: value.etag,
    headers: value.headers,
  });
};

const hydrateClientCache = (
  hydrationData: NexusPayload['hydrationData'],
  pathname: string
): number => {
  const entries = Object.entries(hydrationData);

  entries.forEach(([key, value]) => {
    hydrateEntry(key, value);
    clientCacheStore.indexPathname(pathname, key);
  });

  return entries.length;
};

const applyHydrationPayload = (payload: NexusPayload | null) => {
  if (!payload) return;

  const hydratedCount = hydrateClientCache(
    payload.hydrationData,
    payload.pathname
  );
  const extendedCount = applyTTLExtensions(payload.notModifiedKeys);

  logInitializationResult(hydratedCount, extendedCount);
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

const logInitializationResult = (
  hydratedCount: number,
  extendedCount: number
): void => {
  if (!isDevelopment()) return;

  const totalOperations = hydratedCount + extendedCount;

  if (totalOperations > 0) {
    logger.info(
      `[Provider] Initialized - Hydrated: ${hydratedCount}, Extended: ${extendedCount}`
    );
  }
};

let HYDRATOR_INSTALLED = false;

const setupHydratorOnce = (): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (HYDRATOR_INSTALLED) return;

  HYDRATOR_INSTALLED = true;

  window.addEventListener('nexus:hydrate', (e: Event) => {
    try {
      const detail = (e as CustomEvent).detail as
        | NexusPayload
        | null
        | undefined;

      if (detail) applyHydrationPayload(detail);
    } catch (err) {
      logger.warn('[Provider] Failed to handle nexus:hydrate event', err);
    }
  });
};

type ClientNexusProviderProps = Omit<NexusProviderProps, 'children'>;

export const NexusHydrator = ({ maxSize }: ClientNexusProviderProps) => {
  setupHydratorOnce();

  if (maxSize) {
    clientCacheStore.setMaxSize(maxSize);
  }

  return null;
};
