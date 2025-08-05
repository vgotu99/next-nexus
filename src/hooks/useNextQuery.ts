'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { HEADERS } from '@/constants/cache';
import { nextFetch } from '@/core/client';
import type { ClientCacheEntry } from '@/types/cache';
import type {
  GetNextFetchDefinition,
  NextFetchDefinition,
} from '@/types/definition';
import type {
  NextQueryState,
  UseNextQueryOptions,
  UseNextQueryResult,
} from '@/types/hooks';
import {
  generateCacheKeyFromDefinition,
  isCacheEntryExpired,
} from '@/utils/cacheUtils';
import { isGetDefinition } from '@/utils/definitionUtils';

type QueryAction<TData> =
  | { type: 'SET_DATA'; payload: TData }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'SET_PENDING'; payload: boolean }
  | { type: 'RESET' };

const queryReducer = <TData>(
  state: NextQueryState<TData>,
  action: QueryAction<TData>
): NextQueryState<TData> => {
  const handlers: Record<
    QueryAction<TData>['type'],
    () => NextQueryState<TData>
  > = {
    SET_DATA: () => ({
      ...state,
      data: (action as { type: 'SET_DATA'; payload: TData }).payload,
      error: null,
      isPending: false,
      isSuccess: true,
      isError: false,
    }),
    SET_ERROR: () => ({
      ...state,
      error: (action as { type: 'SET_ERROR'; payload: Error }).payload,
      isPending: false,
      isSuccess: false,
      isError: true,
    }),
    SET_PENDING: () => ({
      ...state,
      error: null,
      isPending: (action as { type: 'SET_PENDING'; payload: boolean }).payload,
      isSuccess: false,
      isError: false,
    }),
    RESET: () => ({
      data: undefined,
      error: null,
      isPending: false,
      isSuccess: false,
      isError: false,
    }),
  };

  return handlers[action.type]?.() || state;
};

const fetchData = async <TData>(
  definition: GetNextFetchDefinition<TData>,
  cacheKey: string
): Promise<TData> => {
  const { client, server } = definition;

  const response = await nextFetch(definition);

  const etag = response.headers.get(HEADERS.RESPONSE_ETAG) || undefined;

  clientCacheStore.set(
    cacheKey,
    response.data,
    client?.revalidate,
    client?.tags,
    server?.tags,
    'fetch',
    etag
  );

  return response.data;
};

export const useNextQuery = <TData = unknown, TSelectedData = TData>(
  definition: NextFetchDefinition<TData>,
  options: UseNextQueryOptions<TData, TSelectedData> = {}
): UseNextQueryResult<TSelectedData> => {
  if (!definition) {
    throw new Error('useNextQuery: definition is required');
  }
  if (!isGetDefinition(definition)) {
    throw new Error('useNextQuery only accepts GET definitions');
  }
  if (typeof definition.endpoint !== 'string' || !definition.endpoint) {
    throw new Error(
      'useNextQuery: definition.endpoint must be a non-empty string'
    );
  }

  const {
    enabled = true,
    select,
    refetchOnWindowFocus = true,
    refetchOnMount = true,
  } = options;

  const [state, dispatch] = useReducer(queryReducer<TSelectedData>, {
    data: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const cacheKey = useMemo(
    () => generateCacheKeyFromDefinition(definition),
    [definition]
  );

  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    dispatch({ type: 'SET_PENDING', payload: true });

    try {
      const data = await fetchData(definition, cacheKey);
      const selectedData = select ? select(data) : (data as TSelectedData);

      dispatch({ type: 'SET_DATA', payload: selectedData });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';

      dispatch({
        type: 'SET_ERROR',
        payload: new Error(`useNextQuery failed: ${errorMessage}`),
      });
    }
  }, [definition, cacheKey, enabled, select]);

  const syncStateWithCache = useCallback((): ClientCacheEntry<TData> | null => {
    if (!enabled) return null;

    const cachedEntry = clientCacheStore.get<TData>(cacheKey);

    if (cachedEntry) {
      const dataToDispatch = select
        ? select(cachedEntry.data)
        : (cachedEntry.data as unknown as TSelectedData);
      dispatch({ type: 'SET_DATA', payload: dataToDispatch });
    } else {
      dispatch({ type: 'RESET' });
    }

    return cachedEntry;
  }, [cacheKey, enabled, select]);

  const initializeQuery = useCallback((): void => {
    if (!enabled) return;

    const cachedEntry = syncStateWithCache();

    if (!cachedEntry || isCacheEntryExpired(cachedEntry)) {
      refetch();
    }
  }, [enabled, refetch, syncStateWithCache]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'RESET' });
      return;
    }

    refetchOnMount ? refetch() : initializeQuery();
  }, [enabled, refetchOnMount, initializeQuery, refetch]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = clientCacheStore.subscribe(
      cacheKey,
      syncStateWithCache
    );

    return unsubscribe;
  }, [cacheKey, enabled, syncStateWithCache]);

  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus) return;

    const handleWindowFocus = () => refetch();

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [enabled, refetchOnWindowFocus, refetch]);

  return {
    ...state,
    refetch,
  };
};
