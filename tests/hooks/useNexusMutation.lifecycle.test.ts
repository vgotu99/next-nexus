import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useNexusMutation } from '@/hooks/useNexusMutation';

import { server } from '../setup';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('useNexusMutation - lifecycle context propagation', () => {
  it('passes context from onStart to onSuccess and onSettled', async () => {
    type Vars = { id: number };
    type Data = { ok: boolean; id: number };
    type Ctx = { token: string };

    server.use(
      http.post('http://localhost/api/mutate-context', async ({ request }) => {
        const body = (await request.json()) as Vars;
        return HttpResponse.json({ ok: true, id: body.id });
      })
    );

    const onStart = jest.fn(
      async (v: Vars): Promise<Ctx> => ({ token: `ctx-${v.id}` })
    );
    const onSuccess = jest.fn(
      async (_data: Data, _vars: Vars, _ctx: Ctx | undefined) => {}
    );
    const onSettled = jest.fn(
      async (_d: Data | undefined, _e: any, _v: Vars, _c: Ctx | undefined) => {}
    );

    const { result } = renderHook(() =>
      useNexusMutation<Ctx, Error, Data, Vars>(
        variables =>
          ({
            method: 'POST',
            baseURL: 'http://localhost',
            endpoint: '/api/mutate-context',
            data: variables,
          }) as const,
        {
          route: 'http://localhost/api/mutate-context',
          onStart,
          onSuccess,
          onSettled,
        }
      )
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 77 });
    });

    expect(onStart).toHaveBeenCalledWith({ id: 77 });
    expect(onSuccess).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalled();

    const successCtx = onSuccess.mock.calls[0][2] as Ctx;
    const settledCtx = onSettled.mock.calls[0][3] as Ctx;

    expect(successCtx).toEqual({ token: 'ctx-77' });
    expect(settledCtx).toEqual({ token: 'ctx-77' });
  });
});
