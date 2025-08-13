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
  onStart?: (variables: TVariables) => TContext | Promise<TContext>;
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

export interface UseNextActionOptions<
  TResult = unknown,
  TArgs extends unknown[] = [FormData],
> {
  onStart?: (...args: TArgs) => void | Promise<void>;
  onSuccess?: (result: TResult, ...args: TArgs) => void | Promise<void>;
  onError?: (error: Error, ...args: TArgs) => void | Promise<void>;
  onSettled?: (
    result: TResult | undefined,
    error: Error | null,
    ...args: TArgs
  ) => void | Promise<void>;
}

export interface UseNextActionResult<
  TResult = unknown,
  TError = Error,
  TArgs extends unknown[] = unknown[],
> {
  execute: (...args: TArgs) => void;
  executeAsync: (...args: TArgs) => Promise<TResult>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  result: TResult | undefined;
  error: TError | null;
  reset: () => void;
}

export type NextActionState<TResult = unknown, TError = Error> = Omit<
  UseNextActionResult<TResult, TError, unknown[]>,
  'execute' | 'executeAsync' | 'reset'
>;

export interface UseNextFormActionOptions<TResult = unknown> {
  onStart?: () => void | Promise<void>;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onSettled?: (
    result: TResult | undefined,
    error: Error | null
  ) => void | Promise<void>;
}

export interface UseNextFormActionResult<TResult = unknown, TError = Error> {
  formAction: (formData: FormData) => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  result: TResult | undefined;
  error: TError | null;
  reset: () => void;
}

export type NextFormActionState<TResult = unknown, TError = Error> = Omit<
  UseNextFormActionResult<TResult, TError>,
  'formAction' | 'reset'
>;
