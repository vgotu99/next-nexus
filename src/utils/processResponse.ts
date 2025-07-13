import { ERROR_CODES, NextFetchError } from '@/errors';
import type { NextFetchResponse } from '@/types';

export const processResponse = async <T>(
  response: Response,
  requestMethod?: string
): Promise<NextFetchResponse<T>> => {
  const nextFetchResponse = response as NextFetchResponse<T>;

  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      nextFetchResponse.data = await response.json();
    } catch (error) {
      throw new NextFetchError('Invalid JSON response', {
        request: new Request(response.url),
        code: ERROR_CODES.ERR_BAD_RESPONSE,
      });
    }
  }

  if (typeof window !== 'undefined') {
    await handleServerCacheSync(response, nextFetchResponse, requestMethod);
  }

  return nextFetchResponse;
};

const handleServerCacheSync = async <T>(
  response: Response,
  nextFetchResponse: NextFetchResponse<T>,
  requestMethod?: string
) => {
  try {
    const { revalidationDetector, syncManager } = await import('../cache');

    const serverMetadata =
      revalidationDetector.extractServerCacheMetadata(response);

    if (serverMetadata) {
      const url = response.url;
      const method = requestMethod || 'GET';

      const wasUpdated = await syncManager.handleSync(
        url,
        method,
        serverMetadata,
        nextFetchResponse.data,
        null
      );

      if (wasUpdated && process.env.NODE_ENV === 'development') {
        console.log(
          `[next-fetch] Server cache change detected, client cache synchronized: ${method} ${url}`
        );
      }
    }
  } catch (error) {
    console.warn('[next-fetch] Server cache synchronization failed:', error);
  }
};
