import { executeRequest, setupHeaders, setupTimeout } from '@/utils';
import type {
  NextFetchInstance,
  NextFetchInterceptorOptions,
  NextFetchRequestConfig,
  NextFetchResponse,
} from '@/types';
import { createMethods } from './methods';
import {
  createRequestInterceptor,
  createResponseInterceptor,
} from './interceptor';
import { applyRequestInterceptors, applyResponseInterceptors } from '@/utils';
import { clientCacheManager, getRequestCache } from '@/cache';

const isClientCacheEnabled = (clientCache: any): boolean => {
  if (!clientCache) return false;
  if (typeof clientCache === 'boolean') return clientCache;
  return true;
};

const getClientCacheTTL = (clientCache: any): number => {
  if (!clientCache || typeof clientCache === 'boolean') {
    return 300;
  }
  return clientCache.revalidate || 300;
};

const extractCacheTags = (config: NextFetchRequestConfig): string[] => {
  const serverTags = config.next?.tags || [];
  const clientCacheConfig = config.clientCache;

  if (!clientCacheConfig || typeof clientCacheConfig === 'boolean') {
    return serverTags;
  }

  const clientTags = (clientCacheConfig as any).tags || [];
  return [...new Set([...serverTags, ...clientTags])];
};

const checkClientCache = async <T>(
  url: string,
  method: string,
  clientCache: any,
  isServer: boolean
): Promise<NextFetchResponse<T> | null> => {
  if (isServer || !isClientCacheEnabled(clientCache)) {
    return null;
  }

  try {
    const cachedEntry = await clientCacheManager.get(url, method);
    if (cachedEntry) {
      const response = new Response(JSON.stringify(cachedEntry.data), {
        status: 200,
        statusText: 'OK (Cached)',
        headers: new Headers({ 'x-cache-status': 'HIT' }),
      });

      return Object.assign(response, { data: cachedEntry.data as T });
    }
  } catch (error) {
    console.warn('Failed to check client cache:', error);
  }

  return null;
};

const buildRequest = (
  url: string,
  config: NextFetchRequestConfig,
  defaultHeaders: HeadersInit,
  defaultTimeout?: number,
  restDefaultConfig: NextFetchRequestConfig = {}
) => {
  const abortController = new AbortController();
  const timeout = config.timeout || defaultTimeout;
  const timeoutId = setupTimeout(abortController, timeout);
  const headers = setupHeaders(defaultHeaders, config.headers);

  const requestConfig: NextFetchRequestConfig = {
    ...restDefaultConfig,
    ...config,
    headers,
    signal: abortController.signal,
  };

  return { requestConfig, timeoutId };
};

const storeResponseInCache = async <T>(
  endpoint: string,
  url: string,
  method: string,
  response: NextFetchResponse<T>,
  config: NextFetchRequestConfig,
  isServer: boolean
) => {
  const clientCache = config.clientCache;

  if (!isClientCacheEnabled(clientCache)) {
    return;
  }

  try {
    if (isServer) {
      const requestCache = getRequestCache();
      requestCache.add({
        endpoint,
        fullURL: url,
        data: response.data,
        method,
        config,
        tags: extractCacheTags(config),
      });
    } else {
      const ttl = getClientCacheTTL(clientCache);
      const tags = extractCacheTags(config);

      await clientCacheManager.set(url, response.data, {
        method,
        ttl,
        tags,
        endpoint,
        serverRevalidateInterval: config.next?.revalidate,
      });
    }
  } catch (error) {
    console.warn('Failed to cache response:', error);
  }
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
  endpoint: string,
  config: NextFetchRequestConfig,
  interceptors: string[] | undefined,
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>,
  defaultHeaders: HeadersInit,
  defaultTimeout?: number,
  restDefaultConfig: NextFetchRequestConfig = {}
): Promise<NextFetchResponse<T>> => {
  const method = (config.method || 'GET').toUpperCase();
  const isServer = typeof window === 'undefined';

  const cachedResponse = await checkClientCache<T>(
    url,
    method,
    config.clientCache,
    isServer
  );
  if (cachedResponse) {
    return cachedResponse;
  }

  const { requestConfig, timeoutId } = buildRequest(
    url,
    config,
    defaultHeaders,
    defaultTimeout,
    restDefaultConfig
  );

  try {
    const requestInterceptors = requestInterceptor.getByNames(interceptors);
    const modifiedConfig =
      requestInterceptors.length > 0
        ? await applyRequestInterceptors(requestConfig, requestInterceptors)
        : requestConfig;

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

    await storeResponseInCache(
      endpoint,
      url,
      method,
      modifiedResponse as NextFetchResponse<T>,
      config,
      isServer
    );

    return modifiedResponse as NextFetchResponse<T>;
  } catch (error) {
    throw error;
  }
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
      endpoint,
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
