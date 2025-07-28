import type { NextFetchDefinition } from './definition';
import type { NextFetchInterceptors } from './interceptor';
import type { NextFetchRequestConfig } from './request';
import type { NextFetchResponse } from './response';

export interface NextFetchInstance {
  <T>(definition: NextFetchDefinition<T>): Promise<NextFetchResponse<T>>;

  interceptors: NextFetchInterceptors;
}

export type NextFetchStatic = {
  create(config?: NextFetchRequestConfig): NextFetchInstance;
};
