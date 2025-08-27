/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useNexusMutation } from '@/hooks/useNexusMutation';

import { server } from '../setup';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('useNexusMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs success flow with callbacks and mutateAsync returns data', async () => {
    type Vars = { id: number };
    type Data = { ok: boolean; id: number };

    server.use(
      http.post('http://localhost/api/mutate-success', async ({ request }) => {
        const body = (await request.json()) as Vars;
        return HttpResponse.json({ ok: true, id: body.id });
      })
    );

    const onStart = jest.fn(async (v: Vars) => ({ startedWith: v.id }));
    const onSuccess = jest.fn(
      async (_data: Data, _vars: Vars, _ctx: any) => {}
    );
    const onError = jest.fn();
    const onSettled = jest.fn(
      async (_d: Data | undefined, _e: any, _v: Vars, _c: any) => {}
    );

    const { result } = renderHook(() =>
      useNexusMutation<any, Error, Data, Vars>(
        variables =>
          ({
            method: 'POST',
            baseURL: 'http://localhost',
            endpoint: '/api/mutate-success',
            data: variables,
          }) as const,
        {
          route: 'http://localhost/api/mutate-success',
          onStart,
          onSuccess,
          onError,
          onSettled,
        }
      )
    );

    let value: Data | undefined;
    await act(async () => {
      value = await result.current.mutateAsync({ id: 123 });
    });

    expect(value).toEqual({ ok: true, id: 123 });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(onStart).toHaveBeenCalledWith({ id: 123 });
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalled();
  });

  it('sets error state and calls onError/onSettled when request fails', async () => {
    server.use(
      http.post('http://localhost/api/mutate-fail', () =>
        HttpResponse.json({ message: 'bad' }, { status: 500 })
      )
    );

    const onError = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useNexusMutation(
        () =>
          ({
            method: 'POST',
            baseURL: 'http://localhost',
            endpoint: '/api/mutate-fail',
            data: { any: true },
          }) as const,
        { onError, onSettled }
      )
    );

    await act(async () => {
      await result.current.mutateAsync({}).catch(() => {});
    });

    expect(result.current.isError).toBe(true);
    expect(onError).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalled();
  });

  it('prevents concurrent mutateAsync calls', async () => {
    server.use(
      http.post('http://localhost/api/mutate-slow', async () => {
        await new Promise(r => setTimeout(r, 50));
        return HttpResponse.json({ ok: true });
      })
    );

    const { result } = renderHook(() =>
      useNexusMutation(
        () =>
          ({
            method: 'POST',
            baseURL: 'http://localhost',
            endpoint: '/api/mutate-slow',
            data: { a: 1 },
          }) as const
      )
    );

    await act(async () => {
      const p1 = result.current.mutateAsync({});
      await Promise.resolve();
      await expect(result.current.mutateAsync({})).rejects.toThrow(
        'already in progress'
      );
      await p1;
    });
  });
});
