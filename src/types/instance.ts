import type {
  NextFetchRequestConfig,
  NextFetchResponse,
  NextFetchInterceptors,
} from '@/types';

export interface NextFetchInstance {
  <T>(
    endpoint: string,
    config?: NextFetchRequestConfig
  ): Promise<NextFetchResponse<T>>;
  get<T>(
    endpoint: string,
    config?: NextFetchRequestConfig
  ): Promise<NextFetchResponse<T>>;
  post<T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    config?: NextFetchRequestConfig
  ): Promise<NextFetchResponse<T>>;
  put<T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    config?: NextFetchRequestConfig
  ): Promise<NextFetchResponse<T>>;
  patch<T, D = Record<string, any>>(
    endpoint: string,
    data?: D,
    config?: NextFetchRequestConfig
  ): Promise<NextFetchResponse<T>>;
  delete<T>(
    endpoint: string,
    config?: NextFetchRequestConfig
  ): Promise<NextFetchResponse<T>>;
  interceptors: NextFetchInterceptors;
}

export type NextFetchStatic = {
  create(config?: NextFetchRequestConfig): NextFetchInstance;
};
