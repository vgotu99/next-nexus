import {
  NextFetchRequestInterceptor,
  NextFetchResponseInterceptor,
} from "../types";

export const createRequestInterceptor = () => {
  const interceptors: Map<string, NextFetchRequestInterceptor> = new Map();

  return {
    use: (
      name: string,
      onFulfilled: NextFetchRequestInterceptor["onFulfilled"],
      onRejected?: NextFetchRequestInterceptor["onRejected"]
    ): void => {
      interceptors.set(name, {
        name,
        onFulfilled,
        onRejected,
      });
    },

    remove: (name: string): void => {
      interceptors.delete(name);
    },

    getAll: (): NextFetchRequestInterceptor[] => {
      return Array.from(interceptors.values());
    },

    get: (name: string): NextFetchRequestInterceptor | undefined => {
      return interceptors.get(name);
    },

    getByNames: (names?: string[]): NextFetchRequestInterceptor[] => {
      if (!names || names.length === 0) {
        return [];
      }

      return names
        .map((name) => interceptors.get(name))
        .filter(
          (interceptor): interceptor is NextFetchRequestInterceptor =>
            !!interceptor
        );
    },
  };
};

export const createResponseInterceptor = () => {
  const interceptors: Map<string, NextFetchResponseInterceptor> = new Map();

  return {
    use: (
      name: string,
      onFulfilled: NextFetchResponseInterceptor["onFulfilled"],
      onRejected?: NextFetchResponseInterceptor["onRejected"]
    ): void => {
      interceptors.set(name, {
        name,
        onFulfilled,
        onRejected,
      });
    },

    remove: (name: string): void => {
      interceptors.delete(name);
    },

    getAll: (): NextFetchResponseInterceptor[] => {
      return Array.from(interceptors.values());
    },

    get: (name: string): NextFetchResponseInterceptor | undefined => {
      return interceptors.get(name);
    },

    getByNames: (names?: string[]): NextFetchResponseInterceptor[] => {
      if (!names || names.length === 0) {
        return [];
      }

      return names
        .map((name) => interceptors.get(name))
        .filter(
          (interceptor): interceptor is NextFetchResponseInterceptor =>
            !!interceptor
        );
    },
  };
};
