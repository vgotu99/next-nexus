'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { nexus } from '@/core/client';
import type { ClientCacheEntry } from '@/types/cache';
import type { GetNexusDefinition, NexusDefinition } from '@/types/definition';
import type {
  NexusQueryState,
  UseNexusQueryOptions,
  UseNexusQueryResult,
} from '@/types/hooks';
import {
  generateCacheKeyFromDefinition,
  isCacheEntryExpired,
  generateETag,
} from '@/utils/cacheUtils';
import { isGetDefinition } from '@/utils/definitionUtils';

type QueryAction<TData> =
  | { type: 'SET_RESULT'; payload: { data: TData; headers: Headers } }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'SET_PENDING'; payload: boolean }
  | { type: 'RESET' };

const queryReducer = <TData>(
  state: NexusQueryState<TData>,
  action: QueryAction<TData>
): NexusQueryState<TData> => {
  switch (action.type) {
    case 'SET_RESULT':
      return {
        ...state,
        data: action.payload.data,
        headers: action.payload.headers,
        error: null,
        isPending: false,
        isSuccess: true,
        isError: false,
      };
    case 'SET_ERROR':
      return {
        ...state,
        data: undefined,
        headers: undefined,
        error: action.payload,
        isPending: false,
        isSuccess: false,
        isError: true,
      };
    case 'SET_PENDING':
      return {
        ...state,
        isPending: action.payload,
        isSuccess: false,
        isError: false,
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

const fetchData = async <TData>(
  definition: GetNexusDefinition<TData>,
  cacheKey: string,
  route?: string
): Promise<{ data: TData; headers: Headers }> => {
  const finalDefinition = route
    ? { ...definition, baseURL: '', endpoint: route }
    : definition;

  const response = await nexus({
    ...finalDefinition,
    client: undefined,
  } as typeof definition);

  const etag =
    response.data !== null && response.data !== undefined
      ? generateETag(response.data)
      : undefined;

  const cachedResponseHeaders = definition.client?.cachedHeaders?.reduce<
    Record<string, string>
  >((acc, headerName) => {
    const headerValue = response.headers.get(headerName);
    if (headerValue !== null) {
      acc[headerName] = headerValue;
    }
    return acc;
  }, {});

  clientCacheStore.set(cacheKey, {
    data: response.data,
    clientRevalidate: definition.client?.revalidate,
    clientTags: definition.client?.tags,
    serverTags: definition.server?.tags,
    source: 'fetch',
    etag,
    headers: cachedResponseHeaders,
  });

  return { data: response.data, headers: response.headers };
};

export const useNexusQuery = <TData = unknown, TSelectedData = TData>(
  definition: NexusDefinition<TData>,
  options: UseNexusQueryOptions<TData, TSelectedData> = {}
): UseNexusQueryResult<TSelectedData> => {
  if (!definition) {
    throw new Error('useNexusQuery: definition is required');
  }
  if (!isGetDefinition(definition)) {
    throw new Error('useNexusQuery only accepts GET definitions');
  }
  if (typeof definition.endpoint !== 'string' || !definition.endpoint) {
    throw new Error(
      'useNexusQuery: definition.endpoint must be a non-empty string'
    );
  }

  const {
    route,
    enabled = true,
    select,
    refetchOnWindowFocus = true,
    refetchOnMount = true,
  } = options;

  const [state, dispatch] = useReducer(queryReducer<TData>, {
    data: undefined,
    headers: undefined,
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
      const { data, headers } = await fetchData(definition, cacheKey, route);
      dispatch({ type: 'SET_RESULT', payload: { data, headers } });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';

      dispatch({
        type: 'SET_ERROR',
        payload: new Error(`useNexusQuery failed: ${errorMessage}`),
      });
    }
  }, [definition, cacheKey, enabled, route]);

  const syncStateWithCache = useCallback((): ClientCacheEntry<TData> | null => {
    if (!enabled) return null;

    const cachedEntry = clientCacheStore.get<TData>(cacheKey);

    if (cachedEntry) {
      dispatch({
        type: 'SET_RESULT',
        payload: {
          data: cachedEntry.data,
          headers: new Headers(cachedEntry.headers || {}),
        },
      });
    } else {
      dispatch({ type: 'RESET' });
    }

    return cachedEntry;
  }, [cacheKey, enabled]);

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

  const selectedData = useMemo(() => {
    if (state.data === undefined) return undefined;
    return select
      ? select(state.data)
      : (state.data as unknown as TSelectedData);
  }, [state.data, select]);

  return {
    ...state,
    data: selectedData,
    refetch,
  };
};
