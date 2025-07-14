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