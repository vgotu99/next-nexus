import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
} from './internal';

export type InterceptorHandler<T> = (value: T) => T | Promise<T>;

export interface NexusRequestInterceptor {
  name: string;
  onFulfilled: InterceptorHandler<InternalNexusRequestConfig>;
  onRejected?: InterceptorHandler<unknown>;
}

export interface NexusResponseInterceptor<T> {
  name: string;
  onFulfilled: InterceptorHandler<InternalNexusResponse<T>>;
  onRejected?: InterceptorHandler<unknown>;
}

export interface NexusInterceptors {
  request: {
    use: (
      name: string,
      onFulfilled: NexusRequestInterceptor['onFulfilled'],
      onRejected?: NexusRequestInterceptor['onRejected']
    ) => void;
    remove: (name: string) => void;
    getAll: () => NexusRequestInterceptor[];
    get: (name: string) => NexusRequestInterceptor | undefined;
  };
  response: {
    use: <TData = unknown>(
      name: string,
      onFulfilled: NexusResponseInterceptor<TData>['onFulfilled'],
      onRejected?: NexusResponseInterceptor<TData>['onRejected']
    ) => void;
    getAll: () => NexusResponseInterceptor<unknown>[];
    remove: (name: string) => void;
    get: (name: string) => NexusResponseInterceptor<unknown> | undefined;
  };
}
