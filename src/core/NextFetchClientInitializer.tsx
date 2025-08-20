'use client';

import { useEffect, type ReactNode } from 'react';

import {
  collectClientCacheMetadata,
  createClientCacheMetadataHeader,
} from '@/cache/clientCacheMetadataCollector';
import { clientCacheStore } from '@/cache/clientCacheStore';
import { HEADERS } from '@/constants/cache';
import type { ClientCacheMetadata } from '@/types/cache';
import { generateBaseKey } from '@/utils/cacheUtils';

const initializeRscRequestInterceptor = (): (() => void) => {
  const originalFetch = window.fetch;

  if ('__nextFetchIntercepted' in originalFetch) {
    return () => {};
  }

  const interceptedFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const isRscRequest = headers.get('RSC') === '1';

    if (!isRscRequest) {
      return originalFetch(input, init);
    }

    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.toString();
    const method = init?.method || 'GET';

    const baseKey = generateBaseKey({ url, method });

    const candidatekeys = clientCacheStore.getCacheKeysFromBaseKey(baseKey);

    if (!candidatekeys || candidatekeys.size === 0) {
      return originalFetch(input, init);
    }

    const clientCacheMetadataArr = Array.from(candidatekeys)
      .map(cacheKey => {
        const entry = clientCacheStore.get(cacheKey);

        if (!entry) return null;

        return collectClientCacheMetadata(cacheKey, entry);
      })
      .filter((metaData): metaData is ClientCacheMetadata => metaData !== null);

    const clientCacheMetadataHeader =
      clientCacheMetadataArr.length > 0
        ? createClientCacheMetadataHeader(clientCacheMetadataArr)
        : null;

    if (clientCacheMetadataHeader) {
      headers.set(HEADERS.CLIENT_CACHE, clientCacheMetadataHeader);

      const modifiedInit = { ...init, headers };
      return originalFetch(input, modifiedInit);
    }

    return originalFetch(input, init);
  };

  Object.defineProperty(interceptedFetch, '__nextFetchIntercepted', {
    value: true,
    writable: false,
  });

  window.fetch = interceptedFetch;

  return () => {
    if (window.fetch === interceptedFetch) {
      window.fetch = originalFetch;
    }
  };
};

const NextFetchClientInitializer = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const cleanup = initializeRscRequestInterceptor();

    return cleanup;
  }, []);

  return <>{children}</>;
};

export default NextFetchClientInitializer;
