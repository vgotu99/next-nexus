'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react';

import type {
  NexusFormActionState,
  UseNexusFormActionOptions,
  UseNexusFormActionResult,
} from '@/types/hooks';

type ActionReducerEvent<TResult, TError> =
  | { type: 'SET_PENDING' }
  | { type: 'SET_SUCCESS'; payload: TResult }
  | { type: 'SET_ERROR'; payload: TError }
  | { type: 'RESET' };

const actionReducer = <TResult, TError>(
  state: NexusFormActionState<TResult, TError>,
  event: ActionReducerEvent<TResult, TError>
): NexusFormActionState<TResult, TError> => {
  switch (event.type) {
    case 'SET_PENDING':
      return {
        ...state,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
        result: undefined,
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
        result: undefined,
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

export function useNexusFormAction<
  TResult = unknown,
  TError extends Error = Error,
>(
  serverAction: (formData: FormData) => Promise<TResult>,
  options?: UseNexusFormActionOptions<TResult>
): UseNexusFormActionResult<TResult, TError> {
  const optionsRef = useRef(options);

  const [state, dispatch] = useReducer(actionReducer<TResult, TError>, {
    result: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const [nativeState, formAction, isNativePending] = useActionState<
    TResult | TError | null,
    FormData
  >(async (_, formData: FormData) => {
    try {
      await optionsRef.current?.onStart?.();
      return await serverAction(formData);
    } catch (error) {
      return (
        error instanceof Error ? error : new Error(String(error))
      ) as TError;
    }
  }, null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const prevPendingRef = useRef(false);

  useEffect(() => {
    const wasPending = prevPendingRef.current;

    if (isNativePending && !wasPending) {
      dispatch({ type: 'SET_PENDING' });
    }

    if (!isNativePending && wasPending) {
      const { onSuccess, onError, onSettled } = optionsRef.current || {};

      const handleCallbacks = async () => {
        if (nativeState instanceof Error) {
          dispatch({ type: 'SET_ERROR', payload: nativeState });

          if (onError) {
            await onError(nativeState);
          }

          if (onSettled) {
            await onSettled(undefined, nativeState);
          }
        } else if (nativeState !== null) {
          dispatch({ type: 'SET_SUCCESS', payload: nativeState });

          if (onSuccess) {
            await onSuccess(nativeState);
          }

          if (onSettled) {
            await onSettled(nativeState, null);
          }
        }
      };

      void handleCallbacks();
    }

    prevPendingRef.current = isNativePending;
  }, [isNativePending, nativeState]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    formAction,
    reset,
  };
}
