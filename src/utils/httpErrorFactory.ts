import { ERROR_CODES } from '@/constants/errorCodes';
import { createNextFetchError } from '@/errors/errorFactory';
import type { NextFetchErrorData, NextFetchErrorInfo } from '@/types/error';
import {
  extractErrorMessage,
  getErrorCodeByStatus,
  getErrorMessageByStatus,
} from '@/utils/errorUtils';

export const createHttpError = (
  status: number,
  response: Response,
  request: Request,
  errorData: NextFetchErrorData
): NextFetchErrorInfo => {
  const message =
    extractErrorMessage(errorData) || getErrorMessageByStatus(status);
  const code = getErrorCodeByStatus(status);

  return createNextFetchError(message, {
    response,
    request,
    data: errorData,
    code,
  });
};

export const validateUrl = (url: string): void => {
  try {
    new URL(url);
  } catch (error) {
    throw createNextFetchError('Invalid URL', {
      request: new Request(url),
      code: ERROR_CODES.INVALID_URL_ERROR,
    });
  }
};

export const createNetworkError = (
  error: unknown,
  request: Request
): NextFetchErrorInfo => {
  if (error instanceof TypeError) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {
      return createNextFetchError('Network Error', {
        request,
        code: ERROR_CODES.NETWORK_ERROR,
      });
    }

    if (error.message.includes('CORS')) {
      return createNextFetchError('CORS Error', {
        request,
        code: ERROR_CODES.NETWORK_ERROR,
      });
    }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    if (error.message === 'timeout') {
      return createNextFetchError('Request timeout', {
        request,
        code: ERROR_CODES.TIMEOUT_ERROR,
      });
    } else {
      return createNextFetchError('Request canceled', {
        request,
        code: ERROR_CODES.CANCELED_ERROR,
      });
    }
  }

  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return createNextFetchError('Invalid JSON response', {
      request,
      code: ERROR_CODES.BAD_RESPONSE_ERROR,
    });
  }

  return createNextFetchError(
    error instanceof Error ? error.message : 'Unknown error',
    {
      request,
      code: ERROR_CODES.UNKNOWN_ERROR,
    }
  );
};
