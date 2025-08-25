import type { ERROR_CODES } from '@/constants/errorCodes';

export interface NexusErrorData {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface NexusErrorResponse {
  data?: NexusErrorData;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface NexusErrorOptions {
  response?: Response;
  request?: Request;
  data?: NexusErrorData;
  config?: RequestInit;
  code?: ErrorCode;
}

export interface NexusErrorInfo extends Error {
  readonly name: 'NexusError';
  readonly response?: NexusErrorResponse;
  readonly request?: Request;
  readonly config?: RequestInit;
  readonly code?: ErrorCode;
}

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorMessageTemplate {
  message: (...args: string[]) => string;
  solution?: string;
  documentation?: string;
}
