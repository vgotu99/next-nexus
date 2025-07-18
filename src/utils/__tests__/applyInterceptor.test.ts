import type {
  NextFetchRequestConfig,
  NextFetchResponse,
  NextFetchRequestInterceptor,
  NextFetchResponseInterceptor,
} from '@/types';

import {
  applyRequestInterceptors,
  applyResponseInterceptors,
} from '../applyInterceptor';

describe('applyRequestInterceptors', () => {
  const mockConfig: NextFetchRequestConfig = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  it('should return config unchanged when no interceptors', async () => {
    const result = await applyRequestInterceptors(mockConfig, []);

    expect(result).toEqual(mockConfig);
  });

  it('should apply single interceptor', async () => {
    const interceptor: NextFetchRequestInterceptor = {
      name: 'test-interceptor',
      onFulfilled: jest.fn().mockResolvedValue({
        ...mockConfig,
        headers: { ...mockConfig.headers, Authorization: 'Bearer token' },
      }),
    };

    const result = await applyRequestInterceptors(mockConfig, [interceptor]);

    expect(interceptor.onFulfilled).toHaveBeenCalledWith(mockConfig);
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
  });

  it('should apply multiple interceptors in sequence', async () => {
    const interceptor1: NextFetchRequestInterceptor = {
      name: 'first-interceptor',
      onFulfilled: jest.fn().mockResolvedValue({
        ...mockConfig,
        headers: { ...mockConfig.headers, 'X-First': 'first' },
      }),
    };

    const interceptor2: NextFetchRequestInterceptor = {
      name: 'second-interceptor',
      onFulfilled: jest.fn().mockImplementation(async config => ({
        ...config,
        headers: { ...config.headers, 'X-Second': 'second' },
      })),
    };

    const result = await applyRequestInterceptors(mockConfig, [
      interceptor1,
      interceptor2,
    ]);

    expect(interceptor1.onFulfilled).toHaveBeenCalledWith(mockConfig);
    expect(interceptor2.onFulfilled).toHaveBeenCalled();
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'X-First': 'first',
      'X-Second': 'second',
    });
  });

  it('should handle interceptor rejection', async () => {
    const error = new Error('Interceptor error');
    const interceptor: NextFetchRequestInterceptor = {
      name: 'error-interceptor',
      onFulfilled: jest.fn().mockRejectedValue(error),
      onRejected: jest.fn().mockReturnValue(new Error('Handled error')),
    };

    await expect(
      applyRequestInterceptors(mockConfig, [interceptor])
    ).rejects.toThrow('Handled error');

    expect(interceptor.onRejected).toHaveBeenCalledWith(error);
  });

  it('should re-throw error when no onRejected handler', async () => {
    const error = new Error('Interceptor error');
    const interceptor: NextFetchRequestInterceptor = {
      name: 'simple-interceptor',
      onFulfilled: jest.fn().mockRejectedValue(error),
    };

    await expect(
      applyRequestInterceptors(mockConfig, [interceptor])
    ).rejects.toThrow('Interceptor error');
  });
});

describe('applyResponseInterceptors', () => {
  const mockResponse: NextFetchResponse<any> = {
    ...new Response(JSON.stringify({ message: 'success' }), {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    }),
    data: { message: 'success' },
  };

  it('should return response unchanged when no interceptors', async () => {
    const result = await applyResponseInterceptors(mockResponse, []);

    expect(result).toEqual(mockResponse);
  });

  it('should apply single interceptor', async () => {
    const modifiedResponse = {
      ...mockResponse,
      data: { ...mockResponse.data, modified: true },
    };

    const interceptor: NextFetchResponseInterceptor = {
      name: 'response-interceptor',
      onFulfilled: jest.fn().mockResolvedValue(modifiedResponse),
    };

    const result = await applyResponseInterceptors(mockResponse, [interceptor]);

    expect(interceptor.onFulfilled).toHaveBeenCalledWith(mockResponse);
    expect(result.data).toEqual({ message: 'success', modified: true });
  });

  it('should apply multiple interceptors in sequence', async () => {
    const interceptor1: NextFetchResponseInterceptor = {
      name: 'first-response-interceptor',
      onFulfilled: jest.fn().mockImplementation(async response => ({
        ...response,
        data: { ...response.data, first: true },
      })),
    };

    const interceptor2: NextFetchResponseInterceptor = {
      name: 'second-response-interceptor',
      onFulfilled: jest.fn().mockImplementation(async response => ({
        ...response,
        data: { ...response.data, second: true },
      })),
    };

    const result = await applyResponseInterceptors(mockResponse, [
      interceptor1,
      interceptor2,
    ]);

    expect(result.data).toEqual({
      message: 'success',
      first: true,
      second: true,
    });
  });

  it('should handle interceptor rejection', async () => {
    const error = new Error('Response interceptor error');
    const interceptor: NextFetchResponseInterceptor = {
      name: 'error-response-interceptor',
      onFulfilled: jest.fn().mockRejectedValue(error),
      onRejected: jest
        .fn()
        .mockReturnValue(new Error('Handled response error')),
    };

    await expect(
      applyResponseInterceptors(mockResponse, [interceptor])
    ).rejects.toThrow('Handled response error');

    expect(interceptor.onRejected).toHaveBeenCalledWith(error);
  });
});
