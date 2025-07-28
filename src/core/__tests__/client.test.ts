import type { NextFetchRequestConfig } from '@/types/request';
import { createNextFetchDefinition } from '@/utils/definitionUtils';

import { createNextFetchInstance } from '../client';

jest.mock('@/utils', () => ({
  executeRequest: jest.fn(),
  setupHeaders: jest.fn(),
  setupTimeout: jest.fn(),
  applyRequestInterceptors: jest.fn(),
  applyResponseInterceptors: jest.fn(),
}));

jest.mock('../interceptor', () => ({
  createRequestInterceptor: jest.fn(() => ({
    use: jest.fn(),
    remove: jest.fn(),
    getAll: jest.fn(() => []),
    get: jest.fn(),
    getByNames: jest.fn(() => []),
  })),
  createResponseInterceptor: jest.fn(() => ({
    use: jest.fn(),
    remove: jest.fn(),
    getAll: jest.fn(() => []),
    get: jest.fn(),
    getByNames: jest.fn(() => []),
  })),
}));

describe('createNextFetchInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create instance with default config', () => {
    const instance = createNextFetchInstance();

    expect(instance).toBeDefined();
    expect(typeof instance).toBe('function');
    expect(instance.interceptors).toBeDefined();
  });

  it('should create instance with custom config', () => {
    const config: NextFetchRequestConfig = {
      baseURL: 'https://api.example.com',
      headers: { Authorization: 'Bearer token' },
      timeout: 5000,
    };

    const instance = createNextFetchInstance(config);

    expect(instance).toBeDefined();
    expect(typeof instance).toBe('function');
    expect(instance.interceptors).toBeDefined();
  });

  it('should have interceptors interface', () => {
    const instance = createNextFetchInstance();

    expect(instance.interceptors).toBeDefined();
    expect(instance.interceptors.request).toBeDefined();
    expect(instance.interceptors.response).toBeDefined();
    expect(typeof instance.interceptors.request.use).toBe('function');
    expect(typeof instance.interceptors.request.remove).toBe('function');
    expect(typeof instance.interceptors.response.use).toBe('function');
    expect(typeof instance.interceptors.response.remove).toBe('function');
  });

  it('should accept NextFetchDefinition and return typed response', async () => {
    const instance = createNextFetchInstance();

    const apiDefinition = createNextFetchDefinition<{
      name: string;
      price: number;
    }>({
      method: 'GET',
      endpoint: '/products',
    });

    const response = await instance(apiDefinition);

    expect(typeof instance).toBe('function');
    expect(instance).toBeDefined();
    expect(response).toBeDefined();
    expect(response.data).toBeDefined();
    expect(response.data?.name).toBe('Product 1');
    expect(response.data?.price).toBe(100);
  });

  it('should work without configuration', () => {
    const instance = createNextFetchInstance();

    expect(instance).toBeDefined();
    expect(typeof instance).toBe('function');
  });
});
