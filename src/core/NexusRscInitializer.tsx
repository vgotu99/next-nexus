'use client';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { COOKIES } from '@/constants/cache';
import type { ClientCacheEntry, ClientCacheMetadata } from '@/types/cache';
import { getTTLFromExpiresAt } from '@/utils/cacheUtils';

const isRscHeader = (headers: Headers) => headers.get('RSC') === '1';
const hasNextUrlHeader = (headers: Headers) => headers.has('Next-Url');
const hasRscAccept = (headers: Headers) => {
  const accept = headers.get('Accept');
  return !!accept && /x-component/i.test(accept);
};

const isRscRequest = (headers: Headers) =>
  isRscHeader(headers) || hasNextUrlHeader(headers) || hasRscAccept(headers);

const toAbsolute = (input: RequestInfo | URL) => {
  try {
    if (typeof input === 'string') return new URL(input, location.origin);
    if (input instanceof Request) return new URL(input.url, location.origin);
    return new URL(String(input), location.origin);
  } catch {
    return null;
  }
};

const buildNormalizedPathname = (url: URL): string => {
  const filtered = new URLSearchParams();

  url.searchParams.forEach((value, key) => {
    if (key === '_rsc') return;
    filtered.append(key, value);
  });

  const queryString = filtered.toString();
  return queryString ? `${url.pathname}?${queryString}` : url.pathname;
};

const collectClientCacheMetadata = (
  cacheKey: string,
  clientCacheEntry: ClientCacheEntry
): ClientCacheMetadata => {
  const ttl = getTTLFromExpiresAt(clientCacheEntry.expiresAt);
  return { ttl, cacheKey, etag: clientCacheEntry.etag };
};

const writeCookie = (name: string, value: string, maxAgeSec: number) => {
  if (typeof document === 'undefined') return;
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

const NEXUS_INTERCEPTED = Symbol.for('nexus.fetchIntercepted');

const initializeRscRequestInterceptor = (): void => {
  if (typeof window === 'undefined') return;

  const currentFetch: typeof fetch | undefined =
    typeof fetch === 'function' ? fetch : undefined;

  if (!currentFetch) return;

  const alreadyWrapped = Reflect.get(currentFetch, NEXUS_INTERCEPTED) === true;

  if (alreadyWrapped) return;

  const originalFetch: typeof fetch = currentFetch;

  const interceptedFetch: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    const headers = new Headers(init?.headers);

    if (isRscRequest(headers)) {
      const url = toAbsolute(input);
      const normalizePathname = url
        ? buildNormalizedPathname(url)
        : typeof location !== 'undefined'
          ? location.pathname
          : '/';

      writeCookie(COOKIES.NEXUS_PATHNAME, normalizePathname, 5);

      const keys = clientCacheStore.getCacheKeysFromPathname(normalizePathname);

      if (keys.length > 0) {
        const metadataArr = keys
          .map(key => {
            const entry = clientCacheStore.get(key);
            return entry ? collectClientCacheMetadata(key, entry) : null;
          })
          .filter(Boolean) as ClientCacheMetadata[];

        if (metadataArr.length > 0) {
          const encoded = btoa(JSON.stringify(metadataArr));
          writeCookie(COOKIES.NEXUS_CLIENT_CACHE, encoded, 5);
        }
      }
    }

    return originalFetch(input, init);
  };

  Reflect.defineProperty(interceptedFetch, NEXUS_INTERCEPTED, {
    value: true,
    writable: false,
    configurable: false,
    enumerable: false,
  });

  Reflect.set(globalThis, 'fetch', interceptedFetch);
};

export const NexusRscInitializer = () => {
  initializeRscRequestInterceptor();

  return null;
};
