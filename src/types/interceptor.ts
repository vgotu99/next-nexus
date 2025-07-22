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

export interface NextFetchResponseInterceptor {
  name: string;
  onFulfilled: InterceptorHandler<InternalNextFetchResponse<unknown>>;
  onRejected?: InterceptorHandler<unknown>;
}

export interface NextFetchInterceptorOptions {
  interceptors?: string[];
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
    use: (
      name: string,
      onFulfilled: NextFetchResponseInterceptor['onFulfilled'],
      onRejected?: NextFetchResponseInterceptor['onRejected']
    ) => void;
    remove: (name: string) => void;
    getAll: () => NextFetchResponseInterceptor[];
    get: (name: string) => NextFetchResponseInterceptor | undefined;
  };
}
