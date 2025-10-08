import { ERROR_CODES } from '@/constants/errorCodes';
import { nexusClient } from '@/core/nexus.client';

jest.mock('@/utils/applyInterceptor', () => ({
  applyRequestInterceptors: jest.fn(async (cfg: any) => cfg),
  applyResponseInterceptors: jest.fn(async (resp: any) => resp),
}));

jest.mock('@/utils/executeRequest', () => ({
  buildRequestConfig: jest.fn(() => ({
    method: 'GET',
    retry: { count: 0, delay: 1 },
    timeout: 5,
  })),
  executeRequest: jest.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    url: 'http://localhost/x',
    redirected: false,
    type: 'basic',
    data: { ok: true },
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    json: async () => ({ ok: true }),
    text: async () => JSON.stringify({ ok: true }),
    clone: function () {
      return { ...this, clone: this.clone };
    },
  })),
}));

jest.mock('@/utils/retry', () => ({
  retry: jest.fn(async ({ attempt }: any) =>
    attempt({ signal: new AbortController().signal })
  ),
}));

jest.mock('@/debug/tracker', () => ({
  trackRequestStart: jest.fn(() => 123),
  trackRequestSuccess: jest.fn(),
  trackRequestError: jest.fn(),
  trackRequestTimeout: jest.fn(),
}));

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('nexus.client lifecycle', () => {
  const def = {
    method: 'GET' as const,
    endpoint: '/x',
    baseURL: 'http://localhost',
    interceptors: [] as string[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks success when final response ok=true', async () => {
    const { applyResponseInterceptors } = await import(
      '@/utils/applyInterceptor'
    );
    const {
      trackRequestStart,
      trackRequestSuccess,
      trackRequestError,
      trackRequestTimeout,
    } = await import('@/debug/tracker');

    (applyResponseInterceptors as jest.Mock).mockImplementation(
      async (resp: any) => resp
    );

    const res = await nexusClient<{ ok: boolean }>(def as any);

    expect(res.ok).toBe(true);
    expect(trackRequestStart).toHaveBeenCalledTimes(1);
    expect(trackRequestSuccess).toHaveBeenCalledTimes(1);
    expect(trackRequestError).not.toHaveBeenCalled();
    expect(trackRequestTimeout).not.toHaveBeenCalled();
  });

  it('tracks error when final response ok=false', async () => {
    const { applyResponseInterceptors } = await import(
      '@/utils/applyInterceptor'
    );
    const { trackRequestError, trackRequestSuccess } = await import(
      '@/debug/tracker'
    );

    (applyResponseInterceptors as jest.Mock).mockImplementation(
      async (resp: any) => ({ ...resp, ok: false, status: 500 })
    );

    const res = await nexusClient(def as any);

    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(trackRequestError).toHaveBeenCalledTimes(1);
    expect(trackRequestSuccess).not.toHaveBeenCalled();
  });

  it('tracks timeout and rethrows when retry rejects with TIMEOUT_ERROR', async () => {
    const { retry } = await import('@/utils/retry');
    const { trackRequestTimeout, trackRequestError } = await import(
      '@/debug/tracker'
    );

    const { createNexusError } = await import('@/errors/errorFactory');
    (retry as jest.Mock).mockImplementationOnce(async () => {
      throw createNexusError('Timeout', { code: ERROR_CODES.TIMEOUT_ERROR });
    });

    await expect(nexusClient(def as any)).rejects.toMatchObject({
      name: 'NexusError',
      code: ERROR_CODES.TIMEOUT_ERROR,
    });

    expect(trackRequestTimeout).toHaveBeenCalledTimes(1);
    expect(trackRequestError).not.toHaveBeenCalled();
  });
});
