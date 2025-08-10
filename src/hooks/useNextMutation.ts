'use client';

import { useCallback, useReducer } from 'react';

import { nextFetch } from '@/core/client';
import type { NextFetchDefinition } from '@/types/definition';
import type {
  NextMutationState,
  UseNextMutationOptions,
  UseNextMutationResult,
} from '@/types/hooks';
import { isMutationDefinition } from '@/utils/definitionUtils';

type MutationAction<TData, TError> =
  | { type: 'SET_PENDING' }
  | { type: 'SET_SUCCESS'; payload: { data: TData; headers: Headers } }
  | { type: 'SET_ERROR'; payload: TError }
  | { type: 'RESET' };

const mutationReducer = <TData, TError>(
  state: NextMutationState<TData, TError>,
  action: MutationAction<TData, TError>
): NextMutationState<TData, TError> => {
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

export const useNextMutation = <
  TContext = unknown,
  TError = Error,
  TData = unknown,
  TVariables = unknown,
>(
  mutationDefinitionFactory: (
    variables: TVariables
  ) => NextFetchDefinition<TData>,
  options: UseNextMutationOptions<TContext, TError, TData, TVariables> = {}
): UseNextMutationResult<TData, TError, TVariables> => {
  if (
    !isMutationDefinition(mutationDefinitionFactory(undefined as TVariables))
  ) {
    throw new Error(
      'useNextMutation only accepts POST, PUT, PATCH, DELETE definitions'
    );
  }

  const { route, onMutate, onSuccess, onError, onSettled } = options;

  const [state, dispatch] = useReducer(mutationReducer<TData, TError>, {
    data: undefined,
    headers: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const executeMutation = useCallback(
    async (variables: TVariables): Promise<TData> => {
      if (state.isPending) {
        throw new Error('Mutation is already in progress');
      }

      const context: TContext | undefined = onMutate
        ? await onMutate(variables)
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

          const response = await nextFetch(finalDefinition);
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
    },
    [
      state.isPending,
      route,
      onMutate,
      onSuccess,
      onError,
      onSettled,
      mutationDefinitionFactory,
    ]
  );

  const mutate = useCallback(
    (variables: TVariables): void => {
      executeMutation(variables).catch(() => {});
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
