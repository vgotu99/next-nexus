import type { CacheOptions } from '@/types/cache';

type AllowedRequestInit = Pick<
  RequestInit,
  | 'headers'
  | 'credentials'
  | 'redirect'
  | 'referrer'
  | 'referrerPolicy'
  | 'integrity'
>;

interface RetryOptions {
  count: number;
  delay?: number;
}

export interface NexusRequestConfig extends AllowedRequestInit, CacheOptions {
  baseURL?: string;
  interceptors?: string[];
  timeout?: number;
  retry?: RetryOptions;
}
