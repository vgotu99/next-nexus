import type {
  NextFetchInstance,
  NextFetchRequestConfig,
  NextFetchResponse,
} from "../types";

export const createMethods = (
  nextFetch: <T>(
    endpoint: string,
    config: NextFetchRequestConfig
  ) => Promise<NextFetchResponse<T>>
): NextFetchInstance => {
  const instance = nextFetch as NextFetchInstance;

  instance.get = <T>(endpoint: string, options?: NextFetchRequestConfig) => {
    return nextFetch<T>(endpoint, { ...options, method: "GET" });
  };

  instance.post = <T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    options?: NextFetchRequestConfig
  ) => {
    return nextFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  instance.put = <T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    options?: NextFetchRequestConfig
  ) => {
    return nextFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  };

  instance.patch = <T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    options?: NextFetchRequestConfig
  ) => {
    return nextFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  };

  instance.delete = <T>(endpoint: string, options?: NextFetchRequestConfig) => {
    return nextFetch<T>(endpoint, { ...options, method: "DELETE" });
  };

  return instance;
};
