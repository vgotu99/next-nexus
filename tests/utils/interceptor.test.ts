import type {
  NexusRequestInterceptor,
  NexusResponseInterceptor,
} from '@/types/interceptor';
import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
} from '@/types/internal';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
} from '@/utils/applyInterceptor';
import { createNexusResponse } from '@/utils/responseProcessor';

const makeRequestConfig = (
  overrides: Partial<InternalNexusRequestConfig> = {}
): InternalNexusRequestConfig => ({
  method: 'GET',
  endpoint: '/api/test',
  ...overrides,
});

describe('interceptors', () => {
  it('applies request interceptors in order', async () => {
    const base = makeRequestConfig();

    const a: NexusRequestInterceptor = {
      name: 'a',
      onFulfilled: async config => ({
        ...config,
        headers: {
          ...(config.headers as Record<string, string> | undefined),
          'x-a': '1',
        },
      }),
    };

    const b: NexusRequestInterceptor = {
      name: 'b',
      onFulfilled: async config => ({
        ...config,
        headers: {
          ...(config.headers as Record<string, string> | undefined),
          'x-a': '1',
          'x-b': '2',
        },
        credentials: 'include',
      }),
    };

    const result = await applyRequestInterceptors(base, [a, b]);

    expect(result.credentials).toBe('include');
    expect(result.headers).toEqual({ 'x-a': '1', 'x-b': '2' });
  });

  it('propagates onRejected result when onFulfilled throws', async () => {
    const base = makeRequestConfig();

    const willThrow: NexusRequestInterceptor = {
      name: 'thrower',
      onFulfilled: () => {
        throw new Error('boom');
      },
      onRejected: err => new Error(`wrapped: ${(err as Error).message}`),
    };

    await expect(applyRequestInterceptors(base, [willThrow])).rejects.toThrow(
      'wrapped: boom'
    );
  });

  it('applies response interceptors and can modify data', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    let base: InternalNexusResponse<{ ok: boolean } | undefined> =
      createNexusResponse(response, { ok: true });

    const r1: NexusResponseInterceptor<unknown> = {
      name: 'r1',
      onFulfilled: async res => ({
        ...res,
        data: { ...(res.data as object), a: 1 } as any,
      }),
    };

    const r2: NexusResponseInterceptor<unknown> = {
      name: 'r2',
      onFulfilled: async res => ({
        ...res,
        data: { ...(res.data as object), b: 2 } as any,
      }),
    };

    base = (await applyResponseInterceptors(base, [
      r1,
      r2,
    ])) as InternalNexusResponse<{ ok: boolean } & { a: number; b: number }>;

    expect(base.data).toEqual({ ok: true, a: 1, b: 2 });
  });

  it('rethrows original error from response interceptor when onRejected is not provided', async () => {
    const response = new Response('{}', { status: 200 });
    const base: InternalNexusResponse<unknown> = createNexusResponse(
      response,
      {}
    );

    const willThrow: NexusResponseInterceptor<unknown> = {
      name: 'r-throw',
      onFulfilled: () => {
        throw new Error('rboom');
      },
    };

    await expect(applyResponseInterceptors(base, [willThrow])).rejects.toThrow(
      'rboom'
    );
  });

  it('wraps error with onRejected when provided in response interceptor', async () => {
    const response = new Response('{}', { status: 200 });
    const base: InternalNexusResponse<unknown> = createNexusResponse(
      response,
      {}
    );

    const willThrow: NexusResponseInterceptor<unknown> = {
      name: 'r-throw',
      onFulfilled: () => {
        throw new Error('rboom');
      },
      onRejected: err => new Error(`wrap:${(err as Error).message}`),
    };

    await expect(applyResponseInterceptors(base, [willThrow])).rejects.toThrow(
      'wrap:rboom'
    );
  });
});
