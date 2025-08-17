import { performance } from 'perf_hooks';

import { requestCache } from '@/cache/requestCache';
import {
  extractClientCacheMetadataFromHeaders,
  hasClientCacheEntryByCacheKey,
} from '@/cache/serverCacheStateProcessor';
import { isClientETagMatched } from '@/cache/serverETagValidator';
import { HEADERS } from '@/constants/cache';
import {
  trackCache,
  trackRequestError,
  trackRequestStart,
  trackRequestSuccess,
} from '@/debug/tracker';
import type { ExtendTTLData, ServerCacheOptions } from '@/types/cache';
import type { NextFetchDefinition } from '@/types/definition';
import type {
  InterceptorHandler,
  NextFetchInterceptors,
} from '@/types/interceptor';
import type {
  InternalNextFetchRequestConfig,
  InternalNextFetchResponse,
  NextOptions,
} from '@/types/internal';
import type { NextFetchResponse } from '@/types/response';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
} from '@/utils/applyInterceptor';
import { generateCacheKey, generateETag } from '@/utils/cacheUtils';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { executeRequest } from '@/utils/executeRequest';
import { retry } from '@/utils/retry';
import { setupHeaders } from '@/utils/setupHeaders';

import {
  createRequestInterceptor,
  createResponseInterceptor,
} from './interceptor';

const transformServerOptionsToNextOptions = (
  server?: ServerCacheOptions
): NextOptions | undefined => {
  if (!server) return undefined;

  const nextOptions: NextOptions = {};
  if (server.revalidate !== undefined) {
    nextOptions.revalidate = server.revalidate;
  }
  if (server.tags?.length) {
    nextOptions.tags = server.tags;
  }

  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
};

const buildRequestConfig = (
  definition: NextFetchDefinition<unknown>
): InternalNextFetchRequestConfig => {
  const {
    method,
    data,
    client,
    server,
    headers: definitionHeaders,
    ...restOptions
  } = definition;

  const headers = setupHeaders(definitionHeaders, {
    [HEADERS.CLIENT_TAGS]: JSON.stringify(client?.tags || []),
    [HEADERS.SERVER_TAGS]: JSON.stringify(server?.tags || []),
  });

  const next = transformServerOptionsToNextOptions(server);

  return {
    ...restOptions,
    method,
    headers,
    next,
    body: data ? JSON.stringify(data) : undefined,
    client,
    server,
  };
};

const createCachedResponse = <T>(
  url: string,
  config: InternalNextFetchRequestConfig
): InternalNextFetchResponse<T | null> => {
  const response = new Response(JSON.stringify(null), {
    status: 204,
    statusText: 'Client Cache Hit',
    headers: { [HEADERS.CACHE_STATUS]: 'CLIENT_HIT' },
  });

  const cachedResponse: Omit<InternalNextFetchResponse<T | null>, 'clone'> = {
    ...response,
    ok: true,
    redirected: false,
    status: 204,
    statusText: 'Client Cache Hit',
    type: 'basic',
    url,
    data: null,
    config,
    request: new Request(url, config),
    headers: new Headers(response.headers),
    json: () => Promise.resolve(null),
    text: () => Promise.resolve(JSON.stringify(null)),
    blob: () => response.blob(),
    arrayBuffer: () => response.arrayBuffer(),
    formData: () => response.formData(),
    body: null,
    bodyUsed: true,
  };

  return {
    ...cachedResponse,
    clone: () => createCachedResponse(url, config),
  };
};

const shouldSkipRequest = (
  headers: Headers,
  url: string,
  method?: string,
  clientTags?: string[],
  serverTags?: string[]
): boolean => {
  if (method?.toUpperCase() !== 'GET') {
    return false;
  }

  const validClientCache = extractClientCacheMetadataFromHeaders(
    headers,
    HEADERS.CLIENT_CACHE
  );

  if (!validClientCache) {
    return false;
  }

  const cacheKey = generateCacheKey({
    endpoint: url,
    method,
    clientTags,
    serverTags,
  });
  return hasClientCacheEntryByCacheKey(validClientCache, cacheKey);
};

const createInterceptorInterface = (
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>
): NextFetchInterceptors => ({
  request: {
    use: (name, onFulfilled, onRejected?) =>
      requestInterceptor.use(name, onFulfilled, onRejected),
    remove: name => requestInterceptor.remove(name),
    getAll: () => requestInterceptor.getAll(),
    get: name => requestInterceptor.get(name),
  },
  response: {
    use: (name, onFulfilled, onRejected?) =>
      responseInterceptor.use(
        name,
        onFulfilled as InterceptorHandler<InternalNextFetchResponse<unknown>>,
        onRejected
      ),
    remove: name => responseInterceptor.remove(name),
    getAll: () => responseInterceptor.getAll(),
    get: name => responseInterceptor.get(name),
  },
});

const addResponseETagToResponseHeaders = <T>(
  response: InternalNextFetchResponse<T | undefined>
): InternalNextFetchResponse<T | undefined> => {
  if (response.headers.get(HEADERS.RESPONSE_ETAG) || !response.data) {
    return response;
  }

  const etag = generateETag(response.data);

  response.headers.set(HEADERS.RESPONSE_ETAG, etag);

  return response;
};

const executeRequestWithLifecycle = async <T>(
  url: string,
  config: InternalNextFetchRequestConfig,
  interceptors: string[],
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>
): Promise<InternalNextFetchResponse<T | null | undefined>> => {
  const startTime = performance.now();
  trackRequestStart({ url, method: config.method || 'GET' });

  const requestInterceptors = requestInterceptor.getByNames(interceptors);
  const modifiedConfig = await applyRequestInterceptors(
    config,
    requestInterceptors
  );

  const headers = new Headers(modifiedConfig.headers);
  const expiredClientCacheMetadata = extractClientCacheMetadataFromHeaders(
    headers,
    HEADERS.REQUEST_ETAG
  );

  if (isServerEnvironment() && modifiedConfig.headers) {
    if (
      shouldSkipRequest(
        headers,
        url,
        modifiedConfig.method,
        modifiedConfig.client?.tags,
        modifiedConfig.server?.tags
      )
    ) {
      trackCache({
        type: 'SKIP',
        key: `${modifiedConfig.method?.toUpperCase() || 'GET'}: ${url}`,
        source: 'server',
        tags: modifiedConfig.client?.tags,
        revalidate: modifiedConfig.client?.revalidate,
        ttl: modifiedConfig.client?.revalidate || 0,
      });

      return createCachedResponse<T>(url, modifiedConfig);
    }
  }

  try {
    const response = await retry({
      attempt: ({ signal }) => {
        const attemptConfig = { ...modifiedConfig, signal };
        const request = new Request(url, attemptConfig);
        return executeRequest<T>(request);
      },
      maxAttempts: (modifiedConfig.retry?.count ?? 0) + 1,
      delaySeconds: modifiedConfig.retry?.delay ?? 1,
      timeoutSeconds: modifiedConfig.timeout ?? 10,
    });

    const responseWithETag = addResponseETagToResponseHeaders(response);

    const shouldSkipHydrationForThisKey =
      isServerEnvironment() &&
      responseWithETag.data &&
      expiredClientCacheMetadata;

    if (shouldSkipHydrationForThisKey) {
      const matched = isClientETagMatched(
        responseWithETag.data,
        expiredClientCacheMetadata
      );

      if (matched) {
        const cacheKey = generateCacheKey({
          endpoint: url,
          method: modifiedConfig.method,
          clientTags: modifiedConfig.client?.tags,
          serverTags: modifiedConfig.server?.tags,
        });

        const current =
          (await requestCache.get<ExtendTTLData>(
            '__NEXT_FETCH_EXTEND_TTL__'
          )) || {};
        const prev = current[cacheKey] ?? 0;
        current[cacheKey] = Math.max(
          prev,
          modifiedConfig.client?.revalidate || 0
        );

        await requestCache.set('__NEXT_FETCH_EXTEND_TTL__', current);

        if (current[cacheKey] > 0) {
          trackCache({
            type: 'MATCH',
            key: `${modifiedConfig.method?.toUpperCase() || 'GET'}: ${url}`,
            source: 'server',
            tags: modifiedConfig.client?.tags,
            revalidate: modifiedConfig.client?.revalidate,
            ttl: modifiedConfig.client?.revalidate || 0,
          });
        }
      }
    }

    if (
      isServerEnvironment() &&
      responseWithETag.data &&
      !shouldSkipHydrationForThisKey
    ) {
      const etag = responseWithETag.headers.get(HEADERS.RESPONSE_ETAG);

      const cachedResponseHeaders =
        modifiedConfig.client?.cachedHeaders?.reduce<Record<string, string>>(
          (acc, headerName) => {
            const headerValue = responseWithETag.headers.get(headerName);
            if (headerValue !== null) {
              acc[headerName] = headerValue;
            }
            return acc;
          },
          {}
        );

      if (etag) {
        const cacheKey = generateCacheKey({
          endpoint: url,
          method: config.method,
          clientTags: config.client?.tags,
          serverTags: config.server?.tags,
        });

        const hydrationCacheEntry = {
          data: responseWithETag.data,
          key: cacheKey,
          clientRevalidate: modifiedConfig.client?.revalidate || 0,
          clientTags: modifiedConfig.client?.tags || [],
          serverTags: modifiedConfig.server?.tags || [],
          etag,
          headers: cachedResponseHeaders,
        };

        await requestCache.set(cacheKey, hydrationCacheEntry);
      }
    }

    const responseWithConfig: InternalNextFetchResponse<T | undefined> = {
      ...responseWithETag,
      config: modifiedConfig,
      request: new Request(url, modifiedConfig),
      clone: () => {
        const clonedResponse = responseWithETag.clone();
        const clonedInternalResponse: InternalNextFetchResponse<T | undefined> =
          {
            ...clonedResponse,
            config: modifiedConfig,
            request: new Request(url, modifiedConfig),
            data: clonedResponse.data,
          };
        return clonedInternalResponse;
      },
    };

    const responseInterceptors = responseInterceptor.getByNames(interceptors);
    const finalResponse = await applyResponseInterceptors<T>(
      responseWithConfig,
      responseInterceptors
    );

    const duration = performance.now() - startTime;

    if (isServerEnvironment()) {
      const cacheStatus = response.headers.get('x-nextjs-cache');
      const ageHeader = response.headers.get('age');
      const age = ageHeader ? parseInt(ageHeader, 10) : undefined;
      const revalidate = modifiedConfig.next?.revalidate as number | undefined;

      if (cacheStatus) {
        trackCache({
          type: cacheStatus as 'HIT' | 'MISS',
          key: `${modifiedConfig.method?.toUpperCase() || 'GET'}: ${url}`,
          source: 'server',
          duration: duration,
          status: finalResponse.status,
          tags: modifiedConfig.next?.tags,
          revalidate: modifiedConfig.next?.revalidate,
          ttl:
            revalidate !== undefined && age !== undefined
              ? revalidate - age
              : undefined,
        });
      }
    }

    if (finalResponse.ok) {
      const responseSize = finalResponse.data
        ? JSON.stringify(finalResponse.data).length
        : 0;
      trackRequestSuccess({
        url,
        method: config.method || 'GET',
        duration,
        status: finalResponse.status,
        responseSize,
      });
    } else {
      trackRequestError({
        url,
        method: config.method || 'GET',
        duration,
        error: `HTTP ${finalResponse.status}`,
      });
    }

    return finalResponse;
  } catch (error) {
    const duration = performance.now() - startTime;
    trackRequestError({
      url,
      method: config.method || 'GET',
      duration,
      error:
        error instanceof Error ? error.message : 'Unknown error after retries',
    });
    throw error;
  }
};

const globalRequestInterceptor = createRequestInterceptor();
const globalResponseInterceptor = createResponseInterceptor();

export const nextFetch = async <T>(
  definition: NextFetchDefinition<T>
): Promise<NextFetchResponse<T>> => {
  const { baseURL, endpoint, interceptors } = definition;
  const url = baseURL ? `${baseURL}${endpoint}` : endpoint;

  const requestConfig = buildRequestConfig(definition);

  return (await executeRequestWithLifecycle<T>(
    url,
    requestConfig,
    interceptors || [],
    globalRequestInterceptor,
    globalResponseInterceptor
  )) as NextFetchResponse<T>;
};

export const interceptors: NextFetchInterceptors = createInterceptorInterface(
  globalRequestInterceptor,
  globalResponseInterceptor
);
