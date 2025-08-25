import {
  NexusRequestInterceptor,
  NexusResponseInterceptor,
} from '@/types/interceptor';

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
  const manager = createInterceptorManager<NexusRequestInterceptor>();

  return {
    ...manager,
    use: (
      name: string,
      onFulfilled: NexusRequestInterceptor['onFulfilled'],
      onRejected?: NexusRequestInterceptor['onRejected'],
    ): void => {
      manager.use(name, { name, onFulfilled, onRejected });
    },
  };
};

export const createResponseInterceptor = () => {
  const manager = createInterceptorManager<NexusResponseInterceptor<unknown>>();

  return {
    ...manager,
    use: (
      name: string,
      onFulfilled: NexusResponseInterceptor<unknown>['onFulfilled'],
      onRejected?: NexusResponseInterceptor<unknown>['onRejected'],
    ): void => {
      manager.use(name, { name, onFulfilled, onRejected });
    },
  };
};
