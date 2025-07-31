'use client';

import { useEffect, type ReactNode } from 'react';

import { createCacheStateHeader } from '@/cache/clientCacheStateCollector';
import { createIfNoneMatchHeader } from '@/cache/expiredCacheETagCollector';

const CLIENT_CACHE_HEADER = 'x-next-fetch-client-cache';
const IF_NONE_MATCH_HEADER = 'if-none-match';

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

    const cacheStateHeader = createCacheStateHeader();
    const ifNoneMatchHeader = createIfNoneMatchHeader();

    if (cacheStateHeader) {
      headers.set(CLIENT_CACHE_HEADER, cacheStateHeader);
    }

    if (ifNoneMatchHeader) {
      headers.set(IF_NONE_MATCH_HEADER, ifNoneMatchHeader);
    }

    if (cacheStateHeader || ifNoneMatchHeader) {
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

const NextFetchClientInitializer = ({
  children,
}: {
  children: ReactNode;
}) => {
  useEffect(() => {
    const cleanup = initializeRscRequestInterceptor();

    return cleanup;
  }, []);

  return <>{children}</>;
};

export default NextFetchClientInitializer;
