'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { clientCache } from '@/cache/clientCache';
import { useNextFetchContext } from '@/context/NextFetchContext';
import type { GetNextFetchDefinition } from '@/types/definition';
import type {
  NextQueryState,
  UseNextQueryOptions,
  UseNextQueryResult,
} from '@/types/hooks';
import type { NextFetchInstance } from '@/types/instance';
import { generateCacheKey, isCacheEntryExpired } from '@/utils/cacheUtils';
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

const createCacheKeyFromDefinition = (
  definition: GetNextFetchDefinition
): string => {
  const { method, endpoint, options } = definition;
  const { client, server } = options || {};

  return generateCacheKey({
    endpoint,
    method,
    clientTags: client?.tags,
    serverTags: server?.tags,
  });
};

const fetchData = async <TData>(
  definition: GetNextFetchDefinition<TData>,
  cacheKey: string,
  nextFetchInstance: NextFetchInstance
): Promise<TData> => {
  const { options } = definition;

  const { data } = await nextFetchInstance(definition);

  await clientCache.setWithTTL(
    cacheKey,
    data,
    options?.client?.revalidate,
    options?.client?.tags,
    options?.server?.tags
  );

  return data;
};

export const useNextQuery = <TData = unknown, TSelectedData = TData>(
  definition: GetNextFetchDefinition<TData>,
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
    instance,
  } = options;

  const { instance: defaultInstance } = useNextFetchContext();
  const nextFetchInstance = instance || defaultInstance;

  const [state, dispatch] = useReducer(queryReducer<TSelectedData>, {
    data: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const cacheKey = useMemo(
    () => createCacheKeyFromDefinition(definition),
    [definition]
  );

  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    dispatch({ type: 'SET_PENDING', payload: true });

    try {
      const data = await fetchData(definition, cacheKey, nextFetchInstance);
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
  }, [definition, cacheKey, enabled, select, nextFetchInstance]);

  const syncStateWithCache = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    const cachedEntry = await clientCache.get(cacheKey);

    if (cachedEntry) {
      const selectedData = select
        ? select(cachedEntry.data as TData)
        : (cachedEntry.data as TSelectedData);
      dispatch({ type: 'SET_DATA', payload: selectedData });
    } else {
      dispatch({ type: 'RESET' });
    }
  }, [cacheKey, enabled, select]);

  const initializeQuery = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    await syncStateWithCache();

    const cachedEntry = await clientCache.get(cacheKey);

    if (!cachedEntry || isCacheEntryExpired(cachedEntry)) {
      refetch();
    }
  }, [cacheKey, enabled, refetch, syncStateWithCache]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'RESET' });
      return;
    }

    refetchOnMount ? refetch() : initializeQuery();
  }, [enabled, refetchOnMount, initializeQuery, refetch]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = clientCache.subscribe(cacheKey, syncStateWithCache);

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
