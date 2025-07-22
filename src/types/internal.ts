import type { NextFetchRequestConfig, NextFetchResponse } from './index';

export interface InternalNextFetchRequestConfig extends NextFetchRequestConfig {
  timeoutId?: NodeJS.Timeout;
  next?: NextOptions;
}

export interface InternalNextFetchResponse<T = unknown>
  extends NextFetchResponse<T> {
  config?: InternalNextFetchRequestConfig;
  request?: Request;
  clone(): InternalNextFetchResponse<T>;
}

export interface NextOptions {
  revalidate?: number | false;
  tags?: string[];
}
