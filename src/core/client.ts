import { performance } from 'perf_hooks';

import { extendCacheEntryTTL } from '@/cache/clientCacheExtender';
import { clientCacheStore } from '@/cache/clientCacheStore';
import {
  getValidCacheMetadataForSkip,
  getCacheMetadataForETag,
  extractClientCacheStateFromHeaders,
  hasClientCacheEntryByCacheKey,
} from '@/cache/serverCacheStateProcessor';
import { createConditionalResponse } from '@/cache/serverETagValidator';
import {
  trackCache,
  trackRequestError,
  trackRequestStart,
  trackRequestSuccess,
} from '@/debug/tracker';
import type {
  InterceptorHandler,
  NextFetchInstance,
  NextFetchInterceptorOptions,
  NextFetchInterceptors,
  NextFetchRequestConfig,
  NextFetchResponse,
  ServerCacheOptions,
} from '@/types';
import type { NextFetchDefinition } from '@/types/definition';
import type {
  InternalNextFetchRequestConfig,
  InternalNextFetchResponse,
  NextOptions,
} from '@/types/internal';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
  executeRequest,
  isClientEnvironment,
  isServerEnvironment,
  setupHeaders,
  setupTimeout,
} from '@/utils';

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
  config: NextFetchRequestConfig,
  defaultHeaders: HeadersInit,
  defaultTimeout?: number,
  restDefaultConfig: NextFetchRequestConfig = {}
): InternalNextFetchRequestConfig => {
  const { server, ...restConfig } = config;
  const abortController = new AbortController();
  const timeout = config.timeout || defaultTimeout;
  const timeoutId = setupTimeout(abortController, timeout);
  const headers = setupHeaders(defaultHeaders, config.headers);
  const next = transformServerOptionsToNextOptions(server);

  return {
    ...restDefaultConfig,
    ...restConfig,
    next,
    headers,
    signal: abortController.signal,
    timeoutId,
  };
};

const createCachedResponse = <T>(
  url: string,
  config: InternalNextFetchRequestConfig
): InternalNextFetchResponse<T | null> => {
  const response = new Response(JSON.stringify(null), {
    status: 204,
    statusText: 'Client Cache Hit',
    headers: { ['x-next-fetch-cache-status']: 'CLIENT_HIT' },
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
  method?: string
): boolean => {
  if (method?.toUpperCase() !== 'GET') {
    return false;
  }

  const allClientCacheState = extractClientCacheStateFromHeaders(headers);
  if (allClientCacheState.length === 0) {
    return false;
  }

  const validClientCacheState = getValidCacheMetadataForSkip(allClientCacheState);
  if (validClientCacheState.length === 0) {
    return false;
  }

  const cacheKey = `${method.toUpperCase()}: ${url}`;
  return hasClientCacheEntryByCacheKey(validClientCacheState, cacheKey);
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

const executeRequestWithLifecycle = async <T>(
  url: string,
  config: InternalNextFetchRequestConfig,
  interceptors: string[] | undefined,
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

  if (isServerEnvironment() && modifiedConfig.headers) {
    const headers = new Headers(modifiedConfig.headers);
    if (shouldSkipRequest(headers, url, modifiedConfig.method)) {
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

  const request = new Request(url, modifiedConfig);
  const response = await executeRequest<T>(request, modifiedConfig.timeoutId);

  if (isServerEnvironment() && response.data && modifiedConfig.headers) {
    const headers = new Headers(modifiedConfig.headers);
    const allClientCacheState = extractClientCacheStateFromHeaders(headers);
    const clientCacheMetadataForETag = getCacheMetadataForETag(allClientCacheState);

    const conditionalResult = createConditionalResponse(
      url,
      response.data,
      headers,
      clientCacheMetadataForETag
    );

    if (conditionalResult.shouldSkip && conditionalResult.response) {
      trackCache({
        type: 'MATCH',
        key: `${config.method?.toUpperCase() || 'GET'}: ${url}`,
        source: 'server',
        tags: modifiedConfig.client?.tags,
        revalidate: modifiedConfig.client?.revalidate,
        ttl: modifiedConfig.client?.revalidate || 0,
      });

      const notModifiedResponse: InternalNextFetchResponse<
        T | null | undefined
      > = {
        ...conditionalResult.response,
        data: null,
        config: modifiedConfig,
        request,
        clone: () => notModifiedResponse,
      };

      return notModifiedResponse;
    }
  }

  const responseWithConfig: InternalNextFetchResponse<T | undefined> = {
    ...response,
    config: modifiedConfig,
    request,
    clone: () => {
      const clonedResponse = response.clone();
      const clonedInternalResponse: InternalNextFetchResponse<T | undefined> = {
        ...clonedResponse,
        config: modifiedConfig,
        request,
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

  if (isClientEnvironment() && finalResponse.status === 304) {
    const cacheKey = `${config.method?.toUpperCase() || 'GET'}:${url}`;

    extendCacheEntryTTL(cacheKey, config.client?.revalidate || 0);

    trackCache({
      type: 'UPDATE',
      key: cacheKey,
      source: 'client-fetch',
      tags: config.client?.tags,
      revalidate: config.client?.revalidate,
      ttl: config.client?.revalidate || 0,
      size: clientCacheStore.size(),
      maxSize: clientCacheStore.getStats().maxSize,
    });
  }

  return finalResponse;
};

export const createNextFetchInstance = (
  defaultConfig: NextFetchRequestConfig = {}
): NextFetchInstance => {
  const {
    baseURL = '',
    headers: defaultHeaders = {},
    timeout: defaultTimeout,
    ...restDefaultConfig
  } = defaultConfig;

  const requestInterceptor = createRequestInterceptor();
  const responseInterceptor = createResponseInterceptor();

  const nextFetch = async <T>(
    definition: NextFetchDefinition<T>
  ): Promise<NextFetchResponse<T>> => {
    const { method, endpoint, options = {} } = definition;
    const { interceptors, ...restConfig } = options as NextFetchRequestConfig &
      NextFetchInterceptorOptions;
    const url = `${baseURL}${endpoint}`;

    const requestConfig = buildRequestConfig(
      {
        ...restConfig,
        method,
        body: definition.data ? JSON.stringify(definition.data) : undefined,
      },
      defaultHeaders,
      defaultTimeout,
      restDefaultConfig
    );

    return (await executeRequestWithLifecycle<T>(
      url,
      requestConfig,
      interceptors,
      requestInterceptor,
      responseInterceptor
    )) as NextFetchResponse<T>;
  };

  const instance = nextFetch as NextFetchInstance;
  instance.interceptors = createInterceptorInterface(
    requestInterceptor,
    responseInterceptor
  );

  return instance;
};
