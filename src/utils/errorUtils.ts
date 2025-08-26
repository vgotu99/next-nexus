import { ERROR_CODES } from '@/constants/errorCodes';
import type { ErrorCode, NexusErrorData } from '@/types/error';

const STATUS_TO_ERROR_CODE_MAP = new Map<number, ErrorCode>([
  [401, ERROR_CODES.UNAUTHORIZED_ERROR],
  [403, ERROR_CODES.FORBIDDEN_ERROR],
  [404, ERROR_CODES.NOT_FOUND_ERROR],
  [429, ERROR_CODES.RATE_LIMITED_ERROR],
]);

export const getErrorCodeByStatus = (status: number): ErrorCode => {
  if (STATUS_TO_ERROR_CODE_MAP.has(status)) {
    return STATUS_TO_ERROR_CODE_MAP.get(status)!;
  }
  return status >= 400 && status < 500
    ? ERROR_CODES.BAD_REQUEST_ERROR
    : ERROR_CODES.SERVER_ERROR;
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
    (status >= 400 && status < 500 ? 'Client Error' : 'Server Error')
  );
};

const ERROR_MESSAGE_KEYS_PRIORITY: Array<keyof NexusErrorData> = [
  'message',
  'error',
  'detail',
];

export const extractErrorMessage = (data: NexusErrorData): string => {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return 'Unknown error occurred';

  const foundKey = ERROR_MESSAGE_KEYS_PRIORITY.find(key => data[key]);

  if (foundKey) {
    return String(data[foundKey]);
  }

  return 'Unknown error occurred';
};
