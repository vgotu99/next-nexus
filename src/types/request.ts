export interface NextFetchRequestConfig extends RequestInit {
  baseURL?: string;
  isInterceptor?: boolean;
  timeout?: number;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}
