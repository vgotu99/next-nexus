'use client';

import { useEffect, type ReactNode } from 'react';

import {
  collectExpiredClientCacheMetadata,
  collectValidClientCacheMetadata,
  createClientCacheMetadataHeader,
} from '@/cache/clientCacheMetadataCollector';
import { clientCacheStore } from '@/cache/clientCacheStore';
import { HEADERS } from '@/constants/cache';
import { generateCacheKey } from '@/utils/cacheUtils';

const safelyParseTags = (tagsHeader: string | null): string[] => {
  if (!tagsHeader) return [];
  try {
    const tags = JSON.parse(tagsHeader);
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error(
      '[next-fetch] Failed to parse cache tags. Defaulting to an empty array.',
      {
        tagsHeader,
        error,
      }
    );
    return [];
  }
};

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
    const clientTags = safelyParseTags(headers.get(HEADERS.CLIENT_TAGS));
    const serverTags = safelyParseTags(headers.get(HEADERS.SERVER_TAGS));

    const currentRequestCacheKey = generateCacheKey({
      endpoint: url,
      method,
      clientTags,
      serverTags,
    });

    const currentRequestClientCacheEntry = clientCacheStore.get<unknown>(
      currentRequestCacheKey
    );

    if (!currentRequestClientCacheEntry) {
      return originalFetch(input, init);
    }

    const validClientCacheMetadata = collectValidClientCacheMetadata(
      currentRequestClientCacheEntry
    );

    const expiredClientCacheMetadata = collectExpiredClientCacheMetadata(
      currentRequestClientCacheEntry
    );

    const validClientCacheMetadataHeader = validClientCacheMetadata
      ? createClientCacheMetadataHeader(validClientCacheMetadata)
      : null;

    const expiredClientCacheMetadataHeader = expiredClientCacheMetadata
      ? createClientCacheMetadataHeader(expiredClientCacheMetadata)
      : null;

    if (validClientCacheMetadataHeader) {
      headers.set(HEADERS.CLIENT_CACHE, validClientCacheMetadataHeader);
    }

    if (expiredClientCacheMetadataHeader) {
      headers.set(HEADERS.REQUEST_ETAG, expiredClientCacheMetadataHeader);
    }

    if (validClientCacheMetadataHeader || expiredClientCacheMetadataHeader) {
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
