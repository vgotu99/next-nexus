import { ERROR_CODES } from '@/constants/errorCodes';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type {
  ErrorCode,
  ErrorMessageTemplate,
  NexusErrorData,
  NexusErrorInfo,
} from '@/types/error';

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
  [401, ERROR_CODES.UNAUTHORIZED_ERROR],
  [403, ERROR_CODES.FORBIDDEN_ERROR],
  [404, ERROR_CODES.NOT_FOUND_ERROR],
  [429, ERROR_CODES.RATE_LIMITED_ERROR],
]);

export const getErrorCodeByStatus = (status: number): ErrorCode => {
  if (STATUS_TO_ERROR_CODE_MAP.has(status)) {
    return STATUS_TO_ERROR_CODE_MAP.get(status)!;
  }
  return isClientError(status)
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
    (isClientError(status) ? 'Client Error' : 'Server Error')
  );
};

export const hasErrorCode = (
  error: NexusErrorInfo,
  code: ErrorCode
): boolean => error.code === code;

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

export const createErrorMessage = (
  errorCode: ErrorCode,
  variables: string
): Omit<ErrorMessageTemplate, 'message'> & { message: string } => {
  const template = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;

  const message = template.message(variables);

  return {
    message: message,
    solution: template.solution,
    documentation: template.documentation,
  };
};
