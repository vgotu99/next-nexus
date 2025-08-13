'use client';

import { useCallback, useReducer, useTransition } from 'react';

import type {
  NextActionState,
  UseNextActionOptions,
  UseNextActionResult,
} from '@/types/hooks';

type ActionReducerEvent<TResult, TError> =
  | { type: 'SET_PENDING' }
  | { type: 'SET_SUCCESS'; payload: TResult }
  | { type: 'SET_ERROR'; payload: TError }
  | { type: 'RESET' };

const actionReducer = <TResult, TError>(
  state: NextActionState<TResult, TError>,
  event: ActionReducerEvent<TResult, TError>
): NextActionState<TResult, TError> => {
  switch (event.type) {
    case 'SET_PENDING':
      return {
        ...state,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
      };
    case 'SET_SUCCESS':
      return {
        ...state,
        result: event.payload,
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: event.payload,
        isPending: false,
        isSuccess: false,
        isError: true,
      };
    case 'RESET':
      return {
        result: undefined,
        error: null,
        isPending: false,
        isSuccess: false,
        isError: false,
      };
    default:
      return state;
  }
};

export const useNextAction = <
  TResult = unknown,
  TError extends Error = Error,
  TArgs extends unknown[] = unknown[],
>(
  serverAction: (...args: TArgs) => Promise<TResult>,
  options: UseNextActionOptions<TResult, TArgs> = {}
): UseNextActionResult<TResult, TError, TArgs> => {
  if (typeof serverAction !== 'function') {
    throw new Error('useNextAction: serverAction must be a function');
  }

  const { onStart, onSuccess, onError, onSettled } = options;

  const [state, dispatch] = useReducer(actionReducer<TResult, TError>, {
    result: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const [isTransitionPending, startTransition] = useTransition();

  const executeAction = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      if (state.isPending || isTransitionPending) {
        throw new Error('useNextAction: action is already in progress');
      }

      if (onStart) {
        await onStart(...args);
      }

      dispatch({ type: 'SET_PENDING' });

      const outcome = await (async () => {
        try {
          const value = await serverAction(...args);
          dispatch({ type: 'SET_SUCCESS', payload: value });
          if (onSuccess) {
            await onSuccess(value, ...args);
          }
          return {
            result: value,
            error: null,
          };
        } catch (error) {
          const typedError = (
            error instanceof Error ? error : new Error('Unknown error')
          ) as TError;
          dispatch({ type: 'SET_ERROR', payload: typedError });
          if (onError) {
            await onError(typedError, ...args);
          }
          return {
            result: undefined,
            error: typedError,
          };
        }
      })();

      if (onSettled) {
        await onSettled(outcome.result, outcome.error, ...args);
      }

      if (outcome.error) {
        throw outcome.error;
      }
      return outcome.result as TResult;
    },
    [
      state.isPending,
      isTransitionPending,
      onStart,
      onSuccess,
      onError,
      onSettled,
      serverAction,
    ]
  );

  const execute = useCallback(
    (...args: TArgs): void => {
      startTransition(() => {
        void executeAction(...args).catch(() => {});
      });
    },
    [executeAction, startTransition]
  );

  const executeAsync = useCallback(
    (...args: TArgs): Promise<TResult> => executeAction(...args),
    [executeAction]
  );

  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    execute,
    executeAsync,
    reset,
  };
};
