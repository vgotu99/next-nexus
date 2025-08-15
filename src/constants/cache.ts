export const DEFAULT_CLIENT_CACHE_MAX_SIZE = 200;
export const MAX_CACHE_KEY_LENGTH = 1000;

export const HEADERS = {
  CLIENT_CACHE: 'x-next-fetch-client-cache',
  REQUEST_ETAG: 'x-next-fetch-request-etag',
  RESPONSE_ETAG: 'x-next-fetch-response-etag',
  CACHE_STATUS: 'x-next-fetch-cache-status',
  CLIENT_TAGS: 'x-next-fetch-client-tags',
  SERVER_TAGS: 'x-next-fetch-server-tags',
} as const;
