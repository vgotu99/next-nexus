'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useTransition,
} from 'react';

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

  const actionForForm = serverAction as unknown as (
    formData: FormData
  ) => Promise<TResult>;
  const [nativeState, nativeFormAction, nativePending] = useActionState(
    ((_: unknown, formData: FormData) => actionForForm(formData)) as (
      prev: unknown,
      formData: FormData
    ) => Promise<unknown> | unknown,
    undefined as unknown as TResult
  );

  const prevPendingRef = useRef(false);
  const prevResultRef = useRef<unknown>(undefined);

  useEffect(() => {
    const prevPending = prevPendingRef.current;
    if (nativePending && !prevPending) {
      dispatch({ type: 'SET_PENDING' });
      if (onStart)
        void (onStart as (...args: TArgs) => void)(...([] as unknown as TArgs));
    }

    if (!nativePending && prevPending) {
      const next = nativeState as TResult | undefined;
      const maybe = next as unknown as { isError?: boolean; error?: unknown };
      const looksError = maybe?.isError === true;
      if (looksError) {
        const err =
          maybe?.error instanceof Error
            ? (maybe.error as TError)
            : (new Error('Action returned error state') as TError);
        dispatch({ type: 'SET_ERROR', payload: err });
        if (onError)
          void (onError as (e: Error, ...args: TArgs) => void)(
            err as Error,
            ...([] as unknown as TArgs)
          );
        if (onSettled)
          void (
            onSettled as (
              r: TResult | undefined,
              e: Error | null,
              ...args: TArgs
            ) => void
          )(undefined, err as Error, ...([] as unknown as TArgs));
      } else {
        dispatch({ type: 'SET_SUCCESS', payload: next as TResult });
        if (onSuccess)
          void (onSuccess as (r: TResult, ...args: TArgs) => void)(
            next as TResult,
            ...([] as unknown as TArgs)
          );
        if (onSettled)
          void (
            onSettled as (
              r: TResult | undefined,
              e: Error | null,
              ...args: TArgs
            ) => void
          )(next as TResult, null, ...([] as unknown as TArgs));
      }
    }

    prevPendingRef.current = nativePending;
    prevResultRef.current = nativeState;
  }, [
    nativePending,
    nativeState,
    nativeFormAction,
    onStart,
    onSuccess,
    onError,
    onSettled,
  ]);

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
            result: value as TResult | undefined,
            error: null as TError | null,
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
            result: undefined as TResult | undefined,
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

  const action = useCallback(
    (...args: TArgs): void => {
      startTransition(() => {
        void executeAction(...args).catch(() => {});
      });
    },
    [executeAction, startTransition]
  );

  const actionAsync = useCallback(
    (...args: TArgs): Promise<TResult> => executeAction(...args),
    [executeAction]
  );

  const formAction = nativeFormAction as unknown as (
    ...args: TArgs
  ) => Promise<TResult>;

  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    action,
    actionAsync,
    formAction,
    isPending: state.isPending || isTransitionPending,
    isSuccess: state.isSuccess,
    isError: state.isError,
    result: state.result,
    error: state.error,
    reset,
  };
};
