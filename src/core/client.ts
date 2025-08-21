import { performance } from 'perf_hooks';

import { clientCacheStore } from '@/cache/clientCacheStore';
import {
  extractClientCacheMetadataFromHeaders,
  findExactClientCacheMetadata,
  hasClientCacheEntryByCacheKey,
} from '@/cache/serverCacheStateProcessor';
import { HEADERS } from '@/constants/cache';
import {
  trackCache,
  trackRequestError,
  trackRequestStart,
  trackRequestSuccess,
} from '@/debug/tracker';
import type { ServerCacheOptions } from '@/types/cache';
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
import {
  generateCacheKey,
  generateCacheKeyFromDefinition,
  generateETag,
  isCacheEntryExpired,
} from '@/utils/cacheUtils';
import {
  isServerEnvironment,
  isClientEnvironment,
} from '@/utils/environmentUtils';
import { executeRequest } from '@/utils/executeRequest';
import { retry } from '@/utils/retry';

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
  const { data, server, ...restOptions } = definition;

  const next = transformServerOptionsToNextOptions(server);

  return {
    ...restOptions,
    next,
    body: data ? JSON.stringify(data) : undefined,
    server,
  };
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

const getInboundHeaders = async () => {
  try {
    const { headers } = await import('next/headers');

    return await headers();
  } catch (error) {
    return null;
  }
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

    if (isServerEnvironment() && modifiedConfig.method === 'GET') {
      const cacheKey = generateCacheKey({
        url,
        method: modifiedConfig.method,
        clientTags: modifiedConfig.client?.tags,
        serverTags: modifiedConfig.server?.tags,
      });

      const inboundHeaders = await getInboundHeaders();
      const responseEtag =
        response.data !== null && generateETag(response.data);

      const clientCacheMetadataArr =
        inboundHeaders && extractClientCacheMetadataFromHeaders(inboundHeaders);
      const exactClientCacheMetadata =
        clientCacheMetadataArr &&
        findExactClientCacheMetadata(clientCacheMetadataArr, cacheKey);

      const hasNoClientCache = !exactClientCacheMetadata;
      const isClientCacheStale = exactClientCacheMetadata?.ttl === 0;
      const isETagMatched =
        !!responseEtag && exactClientCacheMetadata?.etag === responseEtag;

      const shouldSkipHydration = isClientCacheStale && isETagMatched;
      const shouldHydrate =
        hasNoClientCache || (isClientCacheStale && !isETagMatched);

      if (shouldSkipHydration) {
        const { registerNotModifiedKey } = await import('@/scope/notModifiedContext');

        registerNotModifiedKey(cacheKey);

        trackCache({
          type: 'MATCH',
          key: `${modifiedConfig.method?.toUpperCase() || 'GET'}: ${url}`,
          source: 'server',
          tags: modifiedConfig.client?.tags,
          revalidate: modifiedConfig.client?.revalidate,
          ttl: exactClientCacheMetadata.ttl,
        });
      }

      if (shouldHydrate) {
        const cachedResponseHeaders =
          modifiedConfig.client?.cachedHeaders?.reduce<Record<string, string>>(
            (acc, headerName) => {
              const headerValue = response.headers.get(headerName);
              if (headerValue !== null) {
                acc[headerName] = headerValue;
              }
              return acc;
            },
            {}
          );

        const hydrationCacheEntry = {
          data: response.data,
          key: cacheKey,
          clientRevalidate: modifiedConfig.client?.revalidate || 0,
          clientTags: modifiedConfig.client?.tags || [],
          serverTags: modifiedConfig.server?.tags || [],
          etag: responseEtag,
          headers: cachedResponseHeaders,
        };

        const { requestScopeStore } = await import('@/scope/requestScopeStore');

        await requestScopeStore.set(cacheKey, hydrationCacheEntry);
      }
    }

    const responseWithConfig: InternalNextFetchResponse<T | undefined> = {
      ...response,
      config: modifiedConfig,
      request: new Request(url, modifiedConfig),
      clone: () => {
        const clonedResponse = response.clone();
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

    if (isServerEnvironment() && modifiedConfig.method === 'GET') {
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

const createResponseFromClientCache = <T>(
  entry: { data: T },
  url: string,
  config: InternalNextFetchRequestConfig
): NextFetchResponse<T> => {
  const response = new Response(JSON.stringify(entry.data), {
    status: 200,
    statusText: 'OK',
    headers: { [HEADERS.CACHE_STATUS]: 'CLIENT_HIT' },
  });

  return {
    ...response,
    ok: true,
    redirected: false,
    status: 200,
    statusText: 'OK',
    type: 'basic',
    url,
    data: entry.data,
    config,
    request: new Request(url, config),
    headers: new Headers(response.headers),
    json: () => Promise.resolve(entry.data),
    text: () => Promise.resolve(JSON.stringify(entry.data)),
    blob: () => response.blob(),
    arrayBuffer: () => response.arrayBuffer(),
    formData: () => response.formData(),
    body: response.body,
    bodyUsed: false,
    clone: () => createResponseFromClientCache(entry, url, config),
  } as NextFetchResponse<T>;
};

export const nextFetch = async <T>(
  definition: NextFetchDefinition<T>
): Promise<NextFetchResponse<T>> => {
  const { baseURL, endpoint, interceptors, method } = definition;
  const url = baseURL ? `${baseURL}${endpoint}` : endpoint;

  const cacheKey =
    method === 'GET' && generateCacheKeyFromDefinition(definition);
  const requestConfig = buildRequestConfig(definition);

  if (isClientEnvironment() && cacheKey) {
    const entry = clientCacheStore.get<T>(cacheKey);

    if (entry && !isCacheEntryExpired(entry)) {
      return Promise.resolve(
        createResponseFromClientCache(entry, url, requestConfig)
      );
    }
  }

  if (isServerEnvironment() && cacheKey) {
    const inboundHeaders = await getInboundHeaders();

    if (inboundHeaders) {
      const clientCacheMetadataArr =
        extractClientCacheMetadataFromHeaders(inboundHeaders);

      const exactClientCacheMetadata =
        clientCacheMetadataArr &&
        findExactClientCacheMetadata(clientCacheMetadataArr, cacheKey);

      const { isDelegationEnabled } = await import('@/scope/renderRegistry');

      const shouldDelegate =
        exactClientCacheMetadata !== null &&
        exactClientCacheMetadata?.ttl > 0 &&
        isDelegationEnabled() &&
        hasClientCacheEntryByCacheKey(exactClientCacheMetadata, cacheKey);

      if (shouldDelegate) {
        trackCache({
          type: 'DELEGATE',
          key: `${method?.toUpperCase() || 'GET'}: ${url}`,
          source: 'server',
          tags: definition.client?.tags,
          revalidate: definition.client?.revalidate,
          ttl: exactClientCacheMetadata.ttl,
        });

        throw new Promise(() => {});
      }
    }
  }

  const response = await executeRequestWithLifecycle<T>(
    url,
    requestConfig,
    interceptors || [],
    globalRequestInterceptor,
    globalResponseInterceptor
  );

  return response as NextFetchResponse<T>;
};

export const interceptors: NextFetchInterceptors = createInterceptorInterface(
  globalRequestInterceptor,
  globalResponseInterceptor
);
