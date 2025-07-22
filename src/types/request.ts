import type { CacheOptions } from '@/types/cache';

export interface NextFetchRequestConfig extends RequestInit, CacheOptions {
  baseURL?: string;
  isInterceptor?: boolean;
  timeout?: number;
}
