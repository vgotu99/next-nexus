import { ERROR_CODES } from '@/constants/errorCodes';

import { isNextFetchError, NextFetchError } from '../NextFetchError';

const mockRequest = jest.fn();
const mockResponse = jest.fn();

(global as any).Request = mockRequest;
(global as any).Response = mockResponse;

describe('NextFetchError', () => {
  it('should create error with message only', () => {
    const error = NextFetchError('Test error');

    expect(error.name).toBe('NextFetchError');
    expect(error.message).toBe('Test error');
    expect(error.response).toBeUndefined();
    expect(error.request).toBeUndefined();
    expect(error.code).toBeUndefined();
  });

  it('should create error with response details', () => {
    const mockResponse = {
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response;

    const error = NextFetchError('Resource not found', {
      response: mockResponse,
      data: { error: 'Not Found' },
      code: ERROR_CODES.NOT_FOUND_ERROR,
    });

    expect(error.name).toBe('NextFetchError');
    expect(error.message).toBe('Resource not found');
    expect(error.response?.status).toBe(404);
    expect(error.response?.statusText).toBe('Not Found');
    expect(error.response?.data).toEqual({ error: 'Not Found' });
    expect(error.code).toBe(ERROR_CODES.NOT_FOUND_ERROR);
  });

  it('should create error with request details', () => {
    const mockRequest = {
      url: 'https://api.example.com/users',
      method: 'GET',
    } as Request;

    const error = NextFetchError('Network error', {
      request: mockRequest,
      code: ERROR_CODES.NETWORK_ERROR,
    });

    expect(error.name).toBe('NextFetchError');
    expect(error.message).toBe('Network error');
    expect(error.request).toBe(mockRequest);
    expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
  });

  it('should inherit from Error', () => {
    const error = NextFetchError('Test error');

    expect(error instanceof Error).toBe(true);
    expect(isNextFetchError(error)).toBe(true);
  });

  it('should preserve stack trace', () => {
    const error = NextFetchError('Test error');

    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });
});
