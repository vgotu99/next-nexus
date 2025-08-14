import type { CacheOptions } from '@/types/cache';

export interface RetryOptions {
  count: number;
  delay?: number;
}

export interface NextFetchRequestConfig extends RequestInit, CacheOptions {
  baseURL?: string;
  interceptors?: string[];
  timeout?: number;
  retry?: RetryOptions;
}
