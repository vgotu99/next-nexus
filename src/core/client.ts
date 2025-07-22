import {
  extractClientCacheStateFromHeaders,
  hasClientCacheEntryByCacheKey,
} from '@/cache/serverCacheStateProcessor';
import type {
  InterceptorHandler,
  NextFetchInstance,
  NextFetchInterceptorOptions,
  NextFetchInterceptors,
  NextFetchRequestConfig,
  NextFetchResponse,
  ServerCacheOptions,
} from '@/types';
import type {
  InternalNextFetchRequestConfig,
  InternalNextFetchResponse,
  NextOptions,
} from '@/types/internal';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
  executeRequest,
  setupHeaders,
  setupTimeout,
} from '@/utils';

import {
  createRequestInterceptor,
  createResponseInterceptor,
} from './interceptor';
import { createMethods } from './methods';

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

  const clientCacheState = extractClientCacheStateFromHeaders(headers);
  if (clientCacheState.length === 0) {
    return false;
  }

  const cacheKey = `${method.toUpperCase()}:${url}`;
  return hasClientCacheEntryByCacheKey(clientCacheState, cacheKey);
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
  const requestInterceptors = requestInterceptor.getByNames(interceptors);
  const modifiedConfig = await applyRequestInterceptors(
    config,
    requestInterceptors
  );

  if (typeof window === 'undefined' && modifiedConfig.headers) {
    const headers = new Headers(modifiedConfig.headers);
    if (shouldSkipRequest(headers, url, modifiedConfig.method)) {
      return createCachedResponse<T>(url, modifiedConfig);
    }
  }

  const request = new Request(url, modifiedConfig);
  const response = await executeRequest<T>(request, modifiedConfig.timeoutId);

  const responseWithConfig: InternalNextFetchResponse<T | undefined> = {
    ...response,
    config: modifiedConfig,
    request,
  };

  const responseInterceptors = responseInterceptor.getByNames(interceptors);
  return applyResponseInterceptors<T>(responseWithConfig, responseInterceptors);
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
    endpoint: string,
    config: NextFetchRequestConfig & NextFetchInterceptorOptions = {}
  ): Promise<NextFetchResponse<T>> => {
    const { interceptors, ...restConfig } = config;
    const url = `${baseURL}${endpoint}`;

    const requestConfig = buildRequestConfig(
      restConfig,
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

  const instance = createMethods(nextFetch);
  instance.interceptors = createInterceptorInterface(
    requestInterceptor,
    responseInterceptor
  );

  return instance;
};
