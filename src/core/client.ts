import {
  extractClientCacheStateFromHeaders,
  hasClientCacheEntryByCacheKey,
} from '@/cache/serverCacheStateProcessor';
import type {
  NextFetchInstance,
  NextFetchInterceptorOptions,
  NextFetchRequestConfig,
  NextFetchResponse,
  NextOptions,
  ServerCacheOptions,
} from '@/types';
import {
  executeRequest,
  setupHeaders,
  setupTimeout,
  applyRequestInterceptors,
  applyResponseInterceptors,
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

const buildRequest = (
  url: string,
  config: NextFetchRequestConfig,
  defaultHeaders: HeadersInit,
  defaultTimeout?: number,
  restDefaultConfig: NextFetchRequestConfig = {}
) => {
  const { server, ...restConfig } = config;
  const abortController = new AbortController();
  const timeout = config.timeout || defaultTimeout;
  const timeoutId = setupTimeout(abortController, timeout);
  const headers = setupHeaders(defaultHeaders, config.headers);
  const next = transformServerOptionsToNextOptions(server);

  const requestConfig: NextFetchRequestConfig & { next?: NextOptions } = {
    ...restDefaultConfig,
    ...restConfig,
    next,
    headers,
    signal: abortController.signal,
  };

  return { requestConfig, timeoutId };
};

const shouldSkipDueToClientCache = (
  headers: Headers,
  url: string,
  method: string
): boolean => {
  if (method.toUpperCase() !== 'GET') {
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
) => ({
  request: {
    use: (name: string, onFulfilled: any, onRejected?: any) =>
      requestInterceptor.use(name, onFulfilled, onRejected),
    remove: (name: string) => requestInterceptor.remove(name),
    getAll: () => requestInterceptor.getAll(),
    get: (name: string) => requestInterceptor.get(name),
  },
  response: {
    use: (name: string, onFulfilled: any, onRejected?: any) =>
      responseInterceptor.use(name, onFulfilled, onRejected),
    remove: (name: string) => responseInterceptor.remove(name),
    getAll: () => responseInterceptor.getAll(),
    get: (name: string) => responseInterceptor.get(name),
  },
});

const processRequest = async <T>(
  url: string,
  config: NextFetchRequestConfig,
  interceptors: string[] | undefined,
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>,
  defaultHeaders: HeadersInit,
  defaultTimeout?: number,
  restDefaultConfig: NextFetchRequestConfig = {}
): Promise<NextFetchResponse<T>> => {
  const { requestConfig, timeoutId } = buildRequest(
    url,
    config,
    defaultHeaders,
    defaultTimeout,
    restDefaultConfig
  );

  const requestInterceptors = requestInterceptor.getByNames(interceptors);
  const modifiedConfig =
    requestInterceptors.length > 0
      ? await applyRequestInterceptors(requestConfig, requestInterceptors)
      : requestConfig;

  if (typeof window === 'undefined' && modifiedConfig.headers) {
    const headers =
      modifiedConfig.headers instanceof Headers
        ? modifiedConfig.headers
        : new Headers(modifiedConfig.headers);

    if (
      shouldSkipDueToClientCache(headers, url, modifiedConfig.method || 'GET')
    ) {
      const mockResponse = new Response('null', {
        status: 204,
        statusText: 'Client Cache Hit',
        headers: { 'x-next-fetch-cache-status': 'CLIENT_HIT' },
      });

      return {
        data: null as T,
        status: 204,
        statusText: 'Client Cache Hit',
        headers: mockResponse.headers,
        config: modifiedConfig,
        request: new Request(url, modifiedConfig),
        ok: true,
        redirected: false,
        type: 'basic' as ResponseType,
        url: url,
        clone: () => mockResponse.clone(),
        arrayBuffer: () => mockResponse.arrayBuffer(),
        blob: () => mockResponse.blob(),
        formData: () => mockResponse.formData(),
        json: () => Promise.resolve(null),
        text: () => Promise.resolve('null'),
        bytes: () => mockResponse.bytes(),
        body: null,
        bodyUsed: false,
      } as NextFetchResponse<T>;
    }
  }

  const request = new Request(url, modifiedConfig);
  const response = await executeRequest<T>(request, timeoutId);

  const responseInterceptors = responseInterceptor.getByNames(interceptors);
  const modifiedResponse =
    responseInterceptors.length > 0
      ? await applyResponseInterceptors<T>(
          response as NextFetchResponse<T>,
          responseInterceptors
        )
      : (response as NextFetchResponse<T>);

  return modifiedResponse as NextFetchResponse<T>;
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
  ) => {
    const { interceptors, ...restConfig } = config;
    const url = `${baseURL}${endpoint}`;

    return processRequest<T>(
      url,
      restConfig,
      interceptors,
      requestInterceptor,
      responseInterceptor,
      defaultHeaders,
      defaultTimeout,
      restDefaultConfig
    );
  };

  const instance = createMethods(nextFetch);
  instance.interceptors = createInterceptorInterface(
    requestInterceptor,
    responseInterceptor
  );

  return instance;
};
