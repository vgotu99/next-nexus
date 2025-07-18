import type { NextFetchRequestConfig } from '@/types';

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

jest.mock('../methods', () => ({
  createMethods: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('createNextFetchInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create instance with default config', () => {
    const instance = createNextFetchInstance();

    expect(instance).toBeDefined();
    expect(typeof instance).toBe('object');
    expect(instance.interceptors).toBeDefined();
    expect(instance.get).toBeDefined();
    expect(instance.post).toBeDefined();
    expect(instance.put).toBeDefined();
    expect(instance.patch).toBeDefined();
    expect(instance.delete).toBeDefined();
  });

  it('should create instance with custom config', () => {
    const config: NextFetchRequestConfig = {
      baseURL: 'https://api.example.com',
      headers: { Authorization: 'Bearer token' },
      timeout: 5000,
    };

    const instance = createNextFetchInstance(config);

    expect(instance).toBeDefined();
    expect(typeof instance).toBe('object');
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

  it('should have HTTP method shortcuts', () => {
    const instance = createNextFetchInstance();

    expect(typeof instance.get).toBe('function');
    expect(typeof instance.post).toBe('function');
    expect(typeof instance.put).toBe('function');
    expect(typeof instance.patch).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  it('should work without configuration', () => {
    const instance = createNextFetchInstance();

    expect(instance).toBeDefined();
    expect(typeof instance).toBe('object');
  });
});
