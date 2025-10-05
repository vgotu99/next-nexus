import type {
  InterceptorHandler,
  NexusInterceptors,
  NexusRequestInterceptor,
  NexusResponseInterceptor,
} from '@/types/interceptor';
import type { InternalNexusResponse } from '@/types/internal';

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

const createRequestInterceptor = () => {
  const manager = createInterceptorManager<NexusRequestInterceptor>();

  return {
    ...manager,
    use: (
      name: string,
      onFulfilled: NexusRequestInterceptor['onFulfilled'],
      onRejected?: NexusRequestInterceptor['onRejected']
    ): void => {
      manager.use(name, { name, onFulfilled, onRejected });
    },
  };
};

const createResponseInterceptor = () => {
  const manager = createInterceptorManager<NexusResponseInterceptor<unknown>>();

  return {
    ...manager,
    use: (
      name: string,
      onFulfilled: NexusResponseInterceptor<unknown>['onFulfilled'],
      onRejected?: NexusResponseInterceptor<unknown>['onRejected']
    ): void => {
      manager.use(name, { name, onFulfilled, onRejected });
    },
  };
};

const createInterceptorInterface = (
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>
): NexusInterceptors => ({
  request: {
    use: (name, onFulfilled, onRejected?) =>
      requestInterceptor.use(name, onFulfilled, onRejected),
    remove: name => requestInterceptor.remove(name),
    getAll: () => requestInterceptor.getAll(),
    get: name => requestInterceptor.get(name),
  },
  response: {
    use: (name, onFulfilled, onRejected?) =>
      responseInterceptor.use(
        name,
        onFulfilled as InterceptorHandler<InternalNexusResponse<unknown>>,
        onRejected
      ),
    remove: name => responseInterceptor.remove(name),
    getAll: () => responseInterceptor.getAll(),
    get: name => responseInterceptor.get(name),
  },
});

export const globalRequestInterceptor = createRequestInterceptor();
export const globalResponseInterceptor = createResponseInterceptor();

export const interceptors: NexusInterceptors = createInterceptorInterface(
  globalRequestInterceptor,
  globalResponseInterceptor
);
