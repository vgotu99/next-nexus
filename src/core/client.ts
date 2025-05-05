import { executeRequest, setupHeaders, setupTimeout } from "../utils";
import type {
  NextFetchInstance,
  NextFetchInterceptorOptions,
  NextFetchRequestConfig,
} from "../types";
import { NextFetchError } from "../errors";
import { createMethods } from "./methods";
import {
  createRequestInterceptor,
  createResponseInterceptor,
} from "./interceptor";
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
} from "../utils";

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

      return modifiedResponse;
    } catch (error) {
      if (error instanceof NextFetchError) throw error;

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new NextFetchError("Request timeout");
      }

      throw new NextFetchError(
        error instanceof Error ? error.message : "Unknown error"
      );
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
