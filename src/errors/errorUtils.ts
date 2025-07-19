import { type ErrorCode, ERROR_CODES } from './errorCodes';
import type { NextFetchErrorData, NextFetchErrorInfo } from './errorTypes';

const ERROR_MESSAGE_KEYWORDS = {
  network: ['fetch', 'network', 'offline'],
  cors: ['CORS', 'cross-origin'],
  timeout: ['timeout', 'aborted'],
};

export const isNetworkError = (error: unknown): boolean =>
  error instanceof Error &&
  ERROR_MESSAGE_KEYWORDS.network.some(keyword =>
    error.message.includes(keyword)
  );

export const isCorsError = (error: unknown): boolean =>
  error instanceof Error &&
  ERROR_MESSAGE_KEYWORDS.cors.some(keyword => error.message.includes(keyword));

export const isTimeoutError = (error: unknown): boolean =>
  error instanceof Error &&
  ERROR_MESSAGE_KEYWORDS.timeout.some(keyword =>
    error.message.includes(keyword)
  );

export const isStatusError = (status: number): boolean => status >= 400;

export const isClientError = (status: number): boolean =>
  status >= 400 && status < 500;

export const isServerError = (status: number): boolean => status >= 500;

const STATUS_TO_ERROR_CODE_MAP = new Map<number, ErrorCode>([
  [401, ERROR_CODES.ERR_UNAUTHORIZED],
  [403, ERROR_CODES.ERR_FORBIDDEN],
  [404, ERROR_CODES.ERR_NOT_FOUND],
  [429, ERROR_CODES.ERR_RATE_LIMITED],
]);

export const getErrorCodeByStatus = (status: number): ErrorCode => {
  if (STATUS_TO_ERROR_CODE_MAP.has(status)) {
    return STATUS_TO_ERROR_CODE_MAP.get(status)!;
  }
  return isClientError(status)
    ? ERROR_CODES.ERR_BAD_REQUEST
    : ERROR_CODES.ERR_SERVER;
};

const STATUS_TO_ERROR_MESSAGE_MAP: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export const getErrorMessageByStatus = (status: number): string => {
  return (
    STATUS_TO_ERROR_MESSAGE_MAP[status] ||
    (isClientError(status) ? 'Client Error' : 'Server Error')
  );
};

export const hasErrorCode = (
  error: NextFetchErrorInfo,
  code: ErrorCode
): boolean => error.code === code;

const ERROR_MESSAGE_KEYS_PRIORITY: Array<keyof NextFetchErrorData> = [
  'message',
  'error',
  'detail',
];

export const extractErrorMessage = (data: NextFetchErrorData): string => {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return 'Unknown error occurred';

  const foundKey = ERROR_MESSAGE_KEYS_PRIORITY.find(key => data[key]);

  if (foundKey) {
    return String(data[foundKey]);
  }

  return 'Unknown error occurred';
};
