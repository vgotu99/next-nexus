import { executeRequest, setupHeaders, setupTimeout } from "../utils";
import type {
  NextFetchInstance,
  NextFetchInterceptorOptions,
  NextFetchRequestConfig,
} from "../types";
import { createMethods } from "./methods";
import {
  createRequestInterceptor,
  createResponseInterceptor,
} from "./interceptor";
import { applyRequestInterceptors, applyResponseInterceptors } from "../utils";
import { clientCacheManager, getRequestCache } from "../cache";

export const createNextFetchInstance = (
  defaultConfig: NextFetchRequestConfig = {}
): NextFetchInstance => {
  const {
    baseURL = "",
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
    const isServer = typeof window === "undefined";
    const clientCache = config.clientCache;

    if (!isServer && isClientCacheEnabled(clientCache)) {
      try {
        const method = (config.method || "GET").toUpperCase();
        const cachedEntry = await clientCacheManager.get(url, method);

        if (cachedEntry) {
          const response = new Response(JSON.stringify(cachedEntry.data), {
            status: 200,
            statusText: "OK (Cached)",
            headers: new Headers({ "x-cache-status": "HIT" }),
          });

          return Object.assign(response, {
            data: cachedEntry.data,
          });
        }
      } catch (error) {
        console.warn("Failed to check client cache:", error);
      }
    }

    const abortController = new AbortController();
    const timeout = config.timeout || defaultTimeout;
    const timeoutId = setupTimeout(abortController, timeout);
    const headers = setupHeaders(defaultHeaders, config.headers);

    const requestConfig: NextFetchRequestConfig = {
      ...restDefaultConfig,
      ...restConfig,
      headers,
      signal: abortController.signal,
    };

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
          ? await applyResponseInterceptors<T>(response, responseInterceptors)
          : response;

      if (isClientCacheEnabled(clientCache)) {
        try {
          if (isServer) {
            const requestCache = getRequestCache();
            const method = (config.method || "GET").toUpperCase();

            requestCache.add({
              endpoint,
              fullURL: url,
              data: modifiedResponse.data,
              method,
              config: restConfig,
              tags: extractCacheTags(restConfig),
            });
          } else {
            const method = (config.method || "GET").toUpperCase();
            const ttl = getClientCacheTTL(clientCache);
            const tags = extractCacheTags(restConfig);

            await clientCacheManager.set(url, modifiedResponse.data, {
              method,
              ttl,
              tags,
              endpoint,
              serverRevalidateInterval: restConfig.next?.revalidate,
            });
          }
        } catch (error) {
          console.warn("Failed to cache response:", error);
        }
      }

      return modifiedResponse;
    } catch (error) {
      throw error;
    }
  };

  const instance = createMethods(nextFetch);

  instance.interceptors = {
    request: {
      use: (name, onFulfilled, onRejected) =>
        requestInterceptor.use(name, onFulfilled, onRejected),
      remove: (name) => requestInterceptor.remove(name),
      getAll: () => requestInterceptor.getAll(),
      get: (name) => requestInterceptor.get(name),
    },
    response: {
      use: (name, onFulfilled, onRejected) =>
        responseInterceptor.use(name, onFulfilled, onRejected),
      remove: (name) => responseInterceptor.remove(name),
      getAll: () => responseInterceptor.getAll(),
      get: (name) => responseInterceptor.get(name),
    },
  };

  return instance;
};

const isClientCacheEnabled = (clientCache: any): boolean => {
  if (!clientCache) return false;
  if (typeof clientCache === "boolean") return clientCache;

  return true;
}

const getClientCacheTTL = (clientCache: any): number => {
  if (!clientCache || typeof clientCache === "boolean") {
    return 300;
  }
  return clientCache.revalidate || 300;
}

const extractCacheTags = (config: NextFetchRequestConfig): string[] => {
  const serverTags = config.next?.tags || [];
  const clientCacheConfig = config.clientCache;

  if (!clientCacheConfig || typeof clientCacheConfig === "boolean") {
    return serverTags;
  }

  const clientTags = (clientCacheConfig as any).tags || [];
  return [...new Set([...serverTags, ...clientTags])];
}
