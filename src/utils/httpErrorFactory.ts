import { ERROR_CODES } from '@/constants/errorCodes';
import { createNexusError } from '@/errors/errorFactory';
import type { NexusErrorData, NexusErrorInfo } from '@/types/error';
import {
  extractErrorMessage,
  getErrorCodeByStatus,
  getErrorMessageByStatus,
} from '@/utils/errorUtils';

export const createHttpError = (
  status: number,
  response: Response,
  request: Request,
  errorData: NexusErrorData
): NexusErrorInfo => {
  const message =
    extractErrorMessage(errorData) || getErrorMessageByStatus(status);
  const code = getErrorCodeByStatus(status);

  return createNexusError(message, {
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
    throw createNexusError('Invalid URL', {
      code: ERROR_CODES.INVALID_URL_ERROR,
    });
  }
};

export const createNetworkError = (
  error: unknown,
  request: Request
): NexusErrorInfo => {
  const signal = request.signal;

  if (signal?.aborted) {
    if (signal.reason === 'timeout') {
      return createNexusError('Request timeout', {
        request,
        code: ERROR_CODES.TIMEOUT_ERROR,
      });
    }

    return createNexusError('Request canceled', {
      request,
      code: ERROR_CODES.CANCELED_ERROR,
    });
  }

  if (error instanceof TypeError) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {
      return createNexusError('Network Error', {
        request,
        code: ERROR_CODES.NETWORK_ERROR,
      });
    }

    if (error.message.includes('CORS')) {
      return createNexusError('CORS Error', {
        request,
        code: ERROR_CODES.NETWORK_ERROR,
      });
    }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    if (request.signal?.reason === 'timeout' || error.message === 'timeout') {
      return createNexusError('Request timeout', {
        request,
        code: ERROR_CODES.TIMEOUT_ERROR,
      });
    }

    return createNexusError('Request canceled', {
      request,
      code: ERROR_CODES.CANCELED_ERROR,
    });
  }

  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return createNexusError('Invalid JSON response', {
      request,
      code: ERROR_CODES.BAD_RESPONSE_ERROR,
    });
  }

  return createNexusError(
    error instanceof Error ? error.message : 'Unknown error',
    {
      request,
      code: ERROR_CODES.UNKNOWN_ERROR,
    }
  );
};
