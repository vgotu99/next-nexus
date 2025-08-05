import type { CacheOptions } from '@/types/cache';

export interface NextFetchRequestConfig extends RequestInit, CacheOptions {
  baseURL?: string;
  interceptors?: string[];
  timeout?: number;
}
