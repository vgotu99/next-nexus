/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

import { useNexusAction } from '@/hooks/useNexusAction';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('useNexusAction', () => {
  it('runs success flow and returns result', async () => {
    type Args = [number, string];
    type Result = { ok: boolean; sum: number; label: string };

    const serverAction = jest
      .fn<Promise<Result>, Args>()
      .mockImplementation(async (a: number, b: string) => ({
        ok: true,
        sum: a + b.length,
        label: b,
      }));

    const onStart = jest.fn();
    const onSuccess = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useNexusAction<Result, Error, Args>(serverAction, {
        onStart,
        onSuccess,
        onSettled,
      })
    );

    let value: Result | undefined;
    await act(async () => {
      value = await result.current.executeAsync(3, 'abc');
    });

    expect(value).toEqual({ ok: true, sum: 6, label: 'abc' });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(onStart).toHaveBeenCalledWith(3, 'abc');
    expect(onSuccess).toHaveBeenCalledWith(
      { ok: true, sum: 6, label: 'abc' },
      3,
      'abc'
    );
    expect(onSettled).toHaveBeenCalled();
  });

  it('sets error state and calls onError/onSettled on failure', async () => {
    type Result = number;
    const serverAction = jest
      .fn<Promise<Result>, []>()
      .mockRejectedValue(new Error('boom'));
    const onError = jest.fn();
    const onSettled = jest.fn();

    const { result } = renderHook(() =>
      useNexusAction<Result>(serverAction, { onError, onSettled })
    );

    await act(async () => {
      await expect(result.current.executeAsync()).rejects.toThrow('boom');
    });

    expect(result.current.isError).toBe(true);
    expect(onError).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalled();
  });
});
