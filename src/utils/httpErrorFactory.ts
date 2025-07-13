import { ERROR_CODES, ErrorCode, NextFetchError } from '@/errors';

export const createHttpError = (
  status: number,
  response: Response,
  request: Request,
  errorData: any
): NextFetchError => {
  const errorMap: Record<number, { message: string; code: ErrorCode }> = {
    400: { message: 'Bad Request', code: ERROR_CODES.ERR_BAD_REQUEST },
    401: { message: 'Unauthorized', code: ERROR_CODES.ERR_UNAUTHORIZED },
    403: { message: 'Forbidden', code: ERROR_CODES.ERR_FORBIDDEN },
    404: { message: 'Not Found', code: ERROR_CODES.ERR_NOT_FOUND },
    408: { message: 'Request Timeout', code: ERROR_CODES.ERR_TIMEOUT },
    429: { message: 'Too Many Requests', code: ERROR_CODES.ERR_RATE_LIMITED },
  };

  const errorInfo = errorMap[status];

  if (errorInfo) {
    return new NextFetchError(errorInfo.message, {
      response,
      request,
      data: errorData,
      code: errorInfo.code,
    });
  }

  if (status >= 500) {
    return new NextFetchError(`Server Error: ${status}`, {
      response,
      request,
      data: errorData,
      code: ERROR_CODES.ERR_SERVER,
    });
  }

  return new NextFetchError(`Request failed with status ${status}`, {
    response,
    request,
    data: errorData,
    code: ERROR_CODES.ERR_BAD_RESPONSE,
  });
};

export const validateUrl = (url: string): void => {
  try {
    new URL(url);
  } catch (error) {
    throw new NextFetchError('Invalid URL', {
      request: new Request(url),
      code: ERROR_CODES.ERR_INVALID_URL,
    });
  }
};

export const createNetworkError = (
  error: unknown,
  request: Request
): NextFetchError => {
  if (error instanceof TypeError) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {
      return new NextFetchError('Network Error', {
        request,
        code: ERROR_CODES.ERR_NETWORK,
      });
    }

    if (error.message.includes('CORS')) {
      return new NextFetchError('CORS Error', {
        request,
        code: ERROR_CODES.ERR_NETWORK,
      });
    }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    if (error.message === 'timeout') {
      return new NextFetchError('Request timeout', {
        request,
        code: ERROR_CODES.ERR_TIMEOUT,
      });
    } else {
      return new NextFetchError('Request canceled', {
        request,
        code: ERROR_CODES.ERR_CANCELED,
      });
    }
  }

  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return new NextFetchError('Invalid JSON response', {
      request,
      code: ERROR_CODES.ERR_BAD_RESPONSE,
    });
  }

  return new NextFetchError(
    error instanceof Error ? error.message : 'Unknown error',
    {
      request,
      code: ERROR_CODES.ERR_UNKNOWN,
    }
  );
};
