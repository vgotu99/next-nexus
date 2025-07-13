import {
  NextFetchRequestInterceptor,
  NextFetchResponseInterceptor,
} from '@/types';

const createInterceptorManager = <T>() => {
  const interceptors: Map<string, T> = new Map();

  return {
    use: (name: string, interceptor: T): void => {
      interceptors.set(name, interceptor);
    },

    remove: (name: string): void => {
      interceptors.delete(name);
    },

    getAll: (): T[] => {
      return Array.from(interceptors.values());
    },

    get: (name: string): T | undefined => {
      return interceptors.get(name);
    },

    getByNames: (names?: string[]): T[] => {
      if (!names || names.length === 0) {
        return [];
      }

      return names
        .map(name => interceptors.get(name))
        .filter((interceptor): interceptor is T => !!interceptor);
    },
  };
};

export const createRequestInterceptor = () => {
  const manager = createInterceptorManager<NextFetchRequestInterceptor>();

  return {
    ...manager,
    use: (
      name: string,
      onFulfilled: NextFetchRequestInterceptor['onFulfilled'],
      onRejected?: NextFetchRequestInterceptor['onRejected']
    ): void => {
      manager.use(name, { name, onFulfilled, onRejected });
    },
  };
};

export const createResponseInterceptor = () => {
  const manager = createInterceptorManager<NextFetchResponseInterceptor>();

  return {
    ...manager,
    use: (
      name: string,
      onFulfilled: NextFetchResponseInterceptor['onFulfilled'],
      onRejected?: NextFetchResponseInterceptor['onRejected']
    ): void => {
      manager.use(name, { name, onFulfilled, onRejected });
    },
  };
};
