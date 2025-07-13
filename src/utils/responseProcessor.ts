import { ERROR_CODES, NextFetchError } from '@/errors';
import type { NextFetchResponse } from '@/types';

export const isJsonResponse = (response: Response): boolean => {
  return (
    response.headers.get('content-type')?.includes('application/json') ?? false
  );
};

export const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  try {
    return await response.json();
  } catch (error) {
    throw new NextFetchError('Invalid JSON response', {
      request: new Request(response.url),
      code: ERROR_CODES.ERR_BAD_RESPONSE,
    });
  }
};

export const createNextFetchResponse = <T>(
  response: Response,
  data: T
): NextFetchResponse<T> => {
  const nextFetchResponse = response as NextFetchResponse<T>;
  nextFetchResponse.data = data;
  return nextFetchResponse;
};

export const isClientEnvironment = (): boolean => {
  return typeof window !== 'undefined';
};
