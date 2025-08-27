'use client';

import { useCallback, useReducer, useRef } from 'react';

import { nexus } from '@/core/client';
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
  TVariables = unknown,
>(
  mutationDefinitionFactory: (variables: TVariables) => NexusDefinition<TData>,
  options: UseNexusMutationOptions<TContext, TError, TData, TVariables> = {}
): UseNexusMutationResult<TData, TError, TVariables> => {
  if (
    !isMutationDefinition(mutationDefinitionFactory(undefined as TVariables))
  ) {
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
    async (variables: TVariables): Promise<TData> => {
      if (inFlightRef.current) {
        throw new Error('Mutation is already in progress');
      }

      inFlightRef.current = true;

      try {
        const context: TContext | undefined = onStart
          ? await onStart(variables)
          : undefined;

        dispatch({ type: 'SET_PENDING' });

        const result = await (async (): Promise<{
          data: TData | undefined;
          error: TError | null;
        }> => {
          try {
            const definition = mutationDefinitionFactory(variables);
            const finalDefinition = route
              ? { ...definition, baseURL: '', endpoint: route }
              : definition;

            const response = await nexus(finalDefinition);
            const { data, headers } = response;

            dispatch({
              type: 'SET_SUCCESS',
              payload: { data, headers },
            });

            if (onSuccess) {
              await onSuccess(data, variables, context);
            }

            return { data, error: null };
          } catch (error) {
            const typedError = (
              error instanceof Error ? error : new Error('Unknown error')
            ) as TError;
            dispatch({ type: 'SET_ERROR', payload: typedError });

            if (onError) {
              await onError(typedError, variables, context);
            }

            return { data: undefined, error: typedError };
          }
        })();

        if (onSettled) {
          await onSettled(result.data, result.error, variables, context);
        }

        if (result.error) {
          throw result.error;
        }
        return result.data as TData;
      } finally {
        inFlightRef.current = false;
      }
    },
    [route, onStart, onSuccess, onError, onSettled, mutationDefinitionFactory]
  );

  const mutate = useCallback(
    (variables: TVariables): void => {
      void executeMutation(variables).catch(() => {});
    },
    [executeMutation]
  );

  const mutateAsync = useCallback(
    (variables: TVariables): Promise<TData> => {
      return executeMutation(variables);
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
