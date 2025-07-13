import type { NextFetchResponse } from '@/types';
import {
  isJsonResponse,
  parseJsonResponse,
  createNextFetchResponse,
  isClientEnvironment,
} from './responseProcessor';
import { requestLogger } from './logger';

export const processResponse = async <T>(
  response: Response,
  requestMethod?: string
): Promise<NextFetchResponse<T | undefined>> => {
  const data = isJsonResponse(response)
    ? await parseJsonResponse<T>(response)
    : undefined;

  const nextFetchResponse = createNextFetchResponse(response, data);

  if (isClientEnvironment()) {
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

      if (wasUpdated) {
        requestLogger.info(
          `Server cache change detected, client cache synchronized: ${method} ${url}`
        );
      }
    }
  } catch (error) {
    requestLogger.warn('Server cache synchronization failed', error);
  }
};
