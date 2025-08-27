/**
 * @jest-environment jsdom
 */

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  const has = typeof (actual as any).useActionState === 'function';
  const useActionState = has
    ? (actual as any).useActionState
    : (reducer: any, initialState: any) => {
        const React = actual as typeof import('react');
        const [state, setState] = React.useState(initialState);
        const [isPending, setPending] = React.useState(false);
        const formAction = React.useCallback(
          async (arg: any) => {
            setPending(true);
            try {
              const next = await reducer(state, arg);
              setState(next);
            } finally {
              setPending(false);
            }
          },
          [state, reducer]
        );
        return [state, formAction, isPending] as [
          any,
          (arg: any) => Promise<void>,
          boolean,
        ];
      };
  return { ...actual, useActionState };
});

import { act, renderHook, waitFor } from '@testing-library/react';

import { useNexusFormAction } from '@/hooks/useNexusFormAction';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('useNexusFormAction', () => {
  it('pending toggles true during run and reset() clears state', async () => {
    let resolveAction: (v: any) => void;
    const serverAction = jest.fn(
      (_fd: FormData) =>
        new Promise(res => {
          resolveAction = res;
        })
    );

    const onStart = jest.fn();
    const onSuccess = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useNexusFormAction(serverAction, { onStart, onSuccess, onSettled })
    );

    const fd = new FormData();
    fd.set('name', 'hello');

    act(() => {
      void result.current.formAction(fd);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolveAction!({ status: 'ok', value: 'hello' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.result).toEqual({ status: 'ok', value: 'hello' });

    expect(onStart).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ status: 'ok', value: 'hello' });
    expect(onSettled).toHaveBeenCalledWith(
      { status: 'ok', value: 'hello' },
      null
    );

    act(() => {
      result.current.reset();
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('handles delayed rejection and calls onError/onSettled', async () => {
    let rejectAction: (e: any) => void;
    const serverAction = jest.fn(
      (_fd: FormData) =>
        new Promise((_res, rej) => {
          rejectAction = rej;
        })
    );

    const onError = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useNexusFormAction(serverAction, { onError, onSettled })
    );

    act(() => {
      void result.current.formAction(new FormData());
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    rejectAction!(new Error('fail'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('fail');

    expect(onError).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error));
  });
});
