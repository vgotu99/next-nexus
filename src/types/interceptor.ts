import { NextFetchRequestConfig } from "./request";
import { NextFetchResponse } from "./response";

export interface NextFetchRequestInterceptor {
  name: string;
  onFulfilled: (
    config: NextFetchRequestConfig
  ) => NextFetchRequestConfig | Promise<NextFetchRequestConfig>;
  onRejected?: (error: any) => any;
}

export interface NextFetchResponseInterceptor {
  name: string;
  onFulfilled: <T>(
    response: NextFetchResponse<T>
  ) => NextFetchResponse<T> | Promise<NextFetchResponse<T>>;
  onRejected?: (error: any) => any;
}

export interface NextFetchInterceptorOptions {
  interceptors?: string[];
}

export interface NextFetchInterceptors {
  request: {
    use: (
      name: string,
      onFulfilled: NextFetchRequestInterceptor["onFulfilled"],
      onRejected?: NextFetchRequestInterceptor["onRejected"]
    ) => void;
    remove: (name: string) => void;
    getAll: () => NextFetchRequestInterceptor[];
    get: (name: string) => NextFetchRequestInterceptor | undefined;
  };
  response: {
    use: (
      name: string,
      onFulfilled: NextFetchResponseInterceptor["onFulfilled"],
      onRejected?: NextFetchResponseInterceptor["onRejected"]
    ) => void;
    remove: (name: string) => void;
    getAll: () => NextFetchResponseInterceptor[];
    get: (name: string) => NextFetchResponseInterceptor | undefined;
  };
}
