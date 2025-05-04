export interface NextFetchRequestConfig extends RequestInit {
  baseURL?: string;
  isInterceptor?: boolean;
  timeout?: number;
  headers?: HeadersInit;
}
