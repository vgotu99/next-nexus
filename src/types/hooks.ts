export interface UseNextQueryOptions<TData = unknown, TSelectedData = TData> {
  route?: string;
  enabled?: boolean;
  select?: (data: TData) => TSelectedData;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
}

export interface UseNextQueryResult<TSelectedData = unknown> {
  data: TSelectedData | undefined;
  headers: Headers | undefined;
  error: Error | null;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

export type NextQueryState<TSelectedData = unknown> = Omit<
  UseNextQueryResult<TSelectedData>,
  'refetch'
>;

export interface UseNextMutationOptions<
  TContext = unknown,
  TError = Error,
  TData = unknown,
  TVariables = unknown,
> {
  route?: string;
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => void | Promise<void>;
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined
  ) => void | Promise<void>;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void | Promise<void>;
}

export interface UseNextMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
> {
  data: TData | undefined;
  headers: Headers | undefined;
  error: TError | null;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

export type NextMutationState<TData = unknown, TError = Error> = Omit<
  UseNextMutationResult<TData, TError, unknown>,
  'mutate' | 'mutateAsync' | 'reset'
>;
