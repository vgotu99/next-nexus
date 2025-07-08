import type { ClientCache } from "./cache";

export interface NextFetchRequestConfig extends RequestInit {
  baseURL?: string;
  isInterceptor?: boolean;
  timeout?: number;
  clientCache?: ClientCache;
}
