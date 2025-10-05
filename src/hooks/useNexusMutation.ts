'use client';

import { useCallback, useReducer, useRef } from 'react';

import { nexusClient } from '@/core/nexus.client';
import type { NexusDefinition } from '@/types/definition';
import type {
  NexusMutationState,
  UseNexusMutationOptions,
  UseNexusMutationResult,
} from '@/types/hooks';
import { isMutationDefinition } from '@/utils/definitionUtils';

type MutationAction<TData, TError> =
  | { type: 'SET_PENDING' }
  | { type: 'SET_SUCCESS'; payload: { data: TData; headers: Headers } }
  | { type: 'SET_ERROR'; payload: TError }
  | { type: 'RESET' };

const mutationReducer = <TData, TError>(
  state: NexusMutationState<TData, TError>,
  action: MutationAction<TData, TError>
): NexusMutationState<TData, TError> => {
  switch (action.type) {
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
        data: action.payload.data,
        headers: action.payload.headers,
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        headers: undefined,
        isPending: false,
        isSuccess: false,
        isError: true,
      };
    case 'RESET':
      return {
        data: undefined,
        headers: undefined,
        error: null,
        isPending: false,
        isSuccess: false,
        isError: false,
      };
    default:
      return state;
  }
};

export const useNexusMutation = <
  TContext = unknown,
  TError = Error,
  TData = unknown,
  TParam = unknown,
>(
  mutationDefinition: (param: TParam) => NexusDefinition<TData>,
  options: UseNexusMutationOptions<TContext, TError, TData, TParam> = {}
): UseNexusMutationResult<TData, TError, TParam> => {
  if (!isMutationDefinition(mutationDefinition({} as TParam))) {
    throw new Error(
      'useNexusMutation only accepts POST, PUT, PATCH, DELETE definitions'
    );
  }

  const { route, onStart, onSuccess, onError, onSettled } = options;

  const [state, dispatch] = useReducer(mutationReducer<TData, TError>, {
    data: undefined,
    headers: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const inFlightRef = useRef(false);

  const executeMutation = useCallback(
    async (param: TParam): Promise<TData> => {
      if (inFlightRef.current) {
        throw new Error('Mutation is already in progress');
      }

      inFlightRef.current = true;

      try {
        const context: TContext | undefined = onStart
          ? await onStart(param)
          : undefined;

        dispatch({ type: 'SET_PENDING' });

        const result = await (async (): Promise<{
          data: TData | undefined;
          error: TError | null;
        }> => {
          try {
            const definition = mutationDefinition(param);
            const finalDefinition = route
              ? { ...definition, baseURL: '', endpoint: route }
              : definition;

            const response = await nexusClient(finalDefinition);
            const { data, headers } = response;

            dispatch({
              type: 'SET_SUCCESS',
              payload: { data, headers },
            });

            if (onSuccess) {
              await onSuccess(data, param, context);
            }

            return { data, error: null };
          } catch (error) {
            const typedError = (
              error instanceof Error ? error : new Error('Unknown error')
            ) as TError;
            dispatch({ type: 'SET_ERROR', payload: typedError });

            if (onError) {
              await onError(typedError, param, context);
            }

            return { data: undefined, error: typedError };
          }
        })();

        if (onSettled) {
          await onSettled(result.data, result.error, param, context);
        }

        if (result.error) {
          throw result.error;
        }
        return result.data as TData;
      } finally {
        inFlightRef.current = false;
      }
    },
    [route, onStart, onSuccess, onError, onSettled, mutationDefinition]
  );

  const mutate = useCallback(
    (param: TParam): void => {
      void executeMutation(param).catch(() => {});
    },
    [executeMutation]
  );

  const mutateAsync = useCallback(
    (param: TParam): Promise<TData> => {
      return executeMutation(param);
    },
    [executeMutation]
  );

  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    mutate,
    mutateAsync,
    reset,
  };
};
