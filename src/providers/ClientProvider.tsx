'use client';

import { useEffect, type ReactNode } from 'react';

import { createCacheStateHeader } from '@/cache/clientCacheStateCollector';

const CLIENT_CACHE_HEADER = 'x-next-fetch-client-cache';

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

    const cacheStateHeader = await createCacheStateHeader();

    if (cacheStateHeader) {
      headers.set(CLIENT_CACHE_HEADER, cacheStateHeader);
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

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const cleanup = initializeRscRequestInterceptor();

    return cleanup;
  }, []);

  return <>{children}</>;
};
