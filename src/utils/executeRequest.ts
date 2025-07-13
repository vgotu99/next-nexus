import type { NextFetchResponse } from '@/types';
import { NextFetchError } from '@/errors';
import { processResponse } from './processResponse';
import {
  validateUrl,
  createHttpError,
  createNetworkError,
} from './httpErrorFactory';

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
): Promise<NextFetchResponse<T | undefined>> => {
  const cleanup: TimeoutCleanup = () => cleanupTimeout(timeoutId);

  try {
    validateUrl(request.url);

    const response = await performFetch(request);
    cleanup();

    if (!response.ok) {
      await handleErrorResponse(response, request);
    }

    return await processResponse<T>(response, request.method);
  } catch (error) {
    cleanup();

    if (error instanceof NextFetchError) {
      throw error;
    }

    throw createNetworkError(error, request);
  }
};
