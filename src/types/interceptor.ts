import type {
  InternalNextFetchRequestConfig,
  InternalNextFetchResponse,
} from './internal';

export type InterceptorHandler<T> = (value: T) => T | Promise<T>;

export interface NextFetchRequestInterceptor {
  name: string;
  onFulfilled: InterceptorHandler<InternalNextFetchRequestConfig>;
  onRejected?: InterceptorHandler<unknown>;
}

export interface NextFetchResponseInterceptor<T> {
  name: string;
  onFulfilled: InterceptorHandler<InternalNextFetchResponse<T>>;
  onRejected?: InterceptorHandler<unknown>;
}

export interface NextFetchInterceptors {
  request: {
    use: (
      name: string,
      onFulfilled: NextFetchRequestInterceptor['onFulfilled'],
      onRejected?: NextFetchRequestInterceptor['onRejected']
    ) => void;
    remove: (name: string) => void;
    getAll: () => NextFetchRequestInterceptor[];
    get: (name: string) => NextFetchRequestInterceptor | undefined;
  };
  response: {
    use: <TData = unknown>(
      name: string,
      onFulfilled: NextFetchResponseInterceptor<TData>['onFulfilled'],
      onRejected?: NextFetchResponseInterceptor<TData>['onRejected']
    ) => void;
    getAll: () => NextFetchResponseInterceptor<unknown>[];
    remove: (name: string) => void;
    get: (name: string) => NextFetchResponseInterceptor<unknown> | undefined;
  };
}
