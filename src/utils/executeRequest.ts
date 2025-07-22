import { isNextFetchError } from '@/errors/errorFactory';
import type { InternalNextFetchResponse } from '@/types/internal';

import {
  validateUrl,
  createHttpError,
  createNetworkError,
} from './httpErrorFactory';
import { processResponse } from './processResponse';

type TimeoutCleanup = () => void;

const cleanupTimeout = (timeoutId?: NodeJS.Timeout): void => {
  if (timeoutId) clearTimeout(timeoutId);
};

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
  request: Request,
  timeoutId?: NodeJS.Timeout
): Promise<InternalNextFetchResponse<T | undefined>> => {
  const cleanup: TimeoutCleanup = () => cleanupTimeout(timeoutId);

  try {
    validateUrl(request.url);

    const response = await performFetch(request);
    cleanup();

    if (!response.ok) {
      await handleErrorResponse(response, request);
    }

    return processResponse<T>(response, request.method);
  } catch (error) {
    cleanup();

    if (isNextFetchError(error)) {
      throw error;
    }

    throw createNetworkError(error, request);
  }
};
