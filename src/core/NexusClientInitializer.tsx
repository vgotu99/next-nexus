'use client';

import { useEffect } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { COOKIES } from '@/constants/cache';
import type { ClientCacheEntry, ClientCacheMetadata } from '@/types/cache';
import { getTTLFromExpiresAt } from '@/utils/cacheUtils';

const isRsc = (headers: Headers) => headers.get('RSC') === '1';

const toAbsolute = (input: RequestInfo | URL) => {
  try {
    if (typeof input === 'string') return new URL(input, location.origin);
    if (input instanceof Request) return new URL(input.url, location.origin);

    return new URL(String(input), location.origin);
  } catch {
    return null;
  }
};

const collectClientCacheMetadata = (
  cacheKey: string,
  clientCacheEntry: ClientCacheEntry
): ClientCacheMetadata => {
  const ttl = getTTLFromExpiresAt(clientCacheEntry.expiresAt);

  return {
    ttl,
    cacheKey,
    etag: clientCacheEntry.etag,
  };
};

const writeCookie = (name: string, value: string, maxAgeSec: number) => {
  const isHttps =
    typeof location !== 'undefined' && location.protocol === 'https:';
  const attrs = [
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSec}`,
    isHttps ? `Secure` : undefined,
  ]
    .filter(Boolean)
    .join('; ');
  document.cookie = `${name}=${value}; ${attrs}`;
};

const initializeRscRequestInterceptor = (): (() => void) => {
  const originalFetch = window.fetch;

  if ('__nexusIntercepted' in originalFetch) {
    return () => {};
  }

  const interceptedFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);

    if (!isRsc(headers)) {
      return originalFetch(input, init);
    }

    const url = toAbsolute(input);

    if (!url) {
      return originalFetch(input, init);
    }

    const pathname = url.pathname;

    writeCookie(COOKIES.NEXUS_PATHNAME, pathname, 5);

    const keys = clientCacheStore.getCacheKeysFromPathname(pathname);

    if (keys.length === 0) {
      return originalFetch(input, init);
    }

    const metadataArr = keys.map(key => {
      const entry = clientCacheStore.get(key);
      if (!entry) return null;

      return collectClientCacheMetadata(key, entry);
    });

    if (metadataArr.length > 0) {
      const encoded = btoa(JSON.stringify(metadataArr));

      writeCookie(COOKIES.NEXUS_CLIENT_CACHE, encoded, 5);
    }

    return originalFetch(input, init);
  };

  Object.defineProperty(interceptedFetch, '__nexusIntercepted', {
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

const NexusClientInitializer = () => {
  useEffect(() => {
    const cleanup = initializeRscRequestInterceptor();

    return cleanup;
  }, []);

  return null;
};

export default NexusClientInitializer;
