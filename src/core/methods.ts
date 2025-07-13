import type {
  NextFetchInstance,
  NextFetchRequestConfig,
  NextFetchResponse,
} from '@/types';

const createDataMethodConfig = <D>(
  method: string,
  data?: D,
  options?: NextFetchRequestConfig
): NextFetchRequestConfig => ({
  ...options,
  method,
  body: data ? JSON.stringify(data) : undefined,
  headers: {
    'Content-Type': 'application/json',
    ...options?.headers,
  },
});

export const createMethods = (
  nextFetch: <T>(
    endpoint: string,
    config: NextFetchRequestConfig
  ) => Promise<NextFetchResponse<T>>
): NextFetchInstance => {
  const instance = nextFetch as NextFetchInstance;

  instance.get = <T>(endpoint: string, options?: NextFetchRequestConfig) => {
    return nextFetch<T>(endpoint, { ...options, method: 'GET' });
  };

  instance.post = <T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    options?: NextFetchRequestConfig
  ) => {
    return nextFetch<T>(
      endpoint,
      createDataMethodConfig('POST', data, options)
    );
  };

  instance.put = <T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    options?: NextFetchRequestConfig
  ) => {
    return nextFetch<T>(endpoint, createDataMethodConfig('PUT', data, options));
  };

  instance.patch = <T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    options?: NextFetchRequestConfig
  ) => {
    return nextFetch<T>(
      endpoint,
      createDataMethodConfig('PATCH', data, options)
    );
  };

  instance.delete = <T>(endpoint: string, options?: NextFetchRequestConfig) => {
    return nextFetch<T>(endpoint, { ...options, method: 'DELETE' });
  };

  return instance;
};
