import type { NextFetchInstance } from '@/types/instance';

export interface UseNextQueryOptions<TData = unknown, TSelectedData = TData> {
  enabled?: boolean;
  select?: (data: TData) => TSelectedData;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  instance?: NextFetchInstance;
}

export interface UseNextQueryResult<TSelectedData = unknown> {
  data: TSelectedData | undefined;
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
