import { trackRequestError, trackRequestTimeout } from '@/debug/tracker';
import { isNexusError } from '@/errors/errorFactory';
import type { InternalNexusResponse } from '@/types/internal';

import {
  validateUrl,
  createHttpError,
  createNetworkError,
} from './httpErrorFactory';
import { processResponse } from './processResponse';

const performFetch = async (request: Request): Promise<Response> => {
  return await fetch(request);
};

const handleErrorResponse = async (
  response: Response,
  request: Request
): Promise<never> => {
  const errorData = await response.clone().json();
  throw createHttpError(response.status, response, request, errorData);
};

export const executeRequest = async <T>(
  request: Request
): Promise<InternalNexusResponse<T | undefined>> => {
  const startTime = performance.now();

  try {
    validateUrl(request.url);

    const response = await performFetch(request);

    if (!response.ok) {
      await handleErrorResponse(response, request);
    }

    return processResponse<T>(response, request.method);
  } catch (error) {
    const duration = performance.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      trackRequestTimeout({
        url: request.url,
        method: request.method,
        duration,
      });
    } else {
      trackRequestError({
        url: request.url,
        method: request.method,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (isNexusError(error)) {
      throw error;
    }

    throw createNetworkError(error, request);
  }
};
