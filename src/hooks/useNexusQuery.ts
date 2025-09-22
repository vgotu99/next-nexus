'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { nexusClient } from '@/core/nexus.client';
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
  | { type: 'START_FETCH'; payload: { mode: 'foreground' | 'background' } }
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
        isPendingBackground: false,
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
        isPendingBackground: false,
        isSuccess: false,
        isError: true,
      };
    case 'START_FETCH': {
      const isForeGround = action.payload.mode === 'foreground';
      return {
        ...state,
        isPending: isForeGround,
        isPendingBackground: !isForeGround,
        isSuccess: false,
        isError: false,
      };
    }
    case 'RESET':
      return {
        data: undefined,
        headers: undefined,
        error: null,
        isPending: false,
        isPendingBackground: false,
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
  pathname: string,
  route?: string
): Promise<{ data: TData; headers: Headers }> => {
  const finalDefinition = route
    ? { ...definition, baseURL: '', endpoint: route }
    : definition;

  const response = await nexusClient({
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

  clientCacheStore.indexPathname(pathname, cacheKey);

  return { data: response.data, headers: response.headers };
};

const createInflightMap = <T>() => {
  const inflight = new Map<string, Promise<{ data: T; headers: Headers }>>();

  return inflight;
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
    revalidateOnWindowFocus = true,
    revalidateOnMount = true,
  } = options;

  const [state, dispatch] = useReducer(queryReducer<TData>, {
    data: undefined,
    headers: undefined,
    error: null,
    isPending: false,
    isPendingBackground: false,
    isSuccess: false,
    isError: false,
  });

  const cacheKey = useMemo(
    () => generateCacheKeyFromDefinition(definition),
    [definition]
  );

  const pathname = usePathname();

  const createFetchPromise = useCallback(
    (inflight: Map<string, Promise<{ data: TData; headers: Headers }>>) => {
      const created = (async () => {
        try {
          return await fetchData<TData>(
            definition as GetNexusDefinition<TData>,
            cacheKey,
            pathname,
            route
          );
        } finally {
          inflight.delete(cacheKey);
        }
      })();

      inflight.set(cacheKey, created);
      return created;
    },
    [cacheKey, definition, pathname, route]
  );

  const runFetch = useCallback(
    async (mode: 'foreground' | 'background'): Promise<void> => {
      const inflight = createInflightMap<TData>();

      const existing = inflight.get(cacheKey);

      const promise: Promise<{ data: TData; headers: Headers }> = existing
        ? existing
        : createFetchPromise(inflight);

      dispatch({ type: 'START_FETCH', payload: { mode } });

      try {
        const { data, headers } = await promise;
        dispatch({
          type: 'SET_RESULT',
          payload: { data: data, headers },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        dispatch({
          type: 'SET_ERROR',
          payload: new Error(`useNexusQuery failed: ${errorMessage}`),
        });
      }
    },
    [cacheKey, createFetchPromise]
  );

  const getModeByCachedEntry = useCallback((): 'foreground' | 'background' => {
    const cachedEntry = clientCacheStore.get<TData>(cacheKey);

    return cachedEntry ? 'background' : 'foreground';
  }, [cacheKey]);

  const refetch = useCallback(
    async (mode?: 'foreground' | 'background'): Promise<void> => {
      const finalMode = mode ? mode : getModeByCachedEntry();

      await runFetch(finalMode);
    },
    [runFetch, getModeByCachedEntry]
  );

  const syncStateWithCache = useCallback((): ClientCacheEntry<TData> | null => {
    if (!enabled) return null;

    const cachedEntry = clientCacheStore.getWithTracking<TData>(cacheKey);

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

  const revalidate = useCallback(async (): Promise<void> => {
    const cachedEntry = clientCacheStore.get<TData>(cacheKey);

    if (!cachedEntry) return;

    if (!isCacheEntryExpired(cachedEntry)) return;

    await runFetch('background');
  }, [cacheKey, runFetch]);

  const initializeQuery = useCallback(
    (shouldRevalidateOnMount: boolean): void => {
      if (!enabled) return;

      const cachedEntry = syncStateWithCache();

      if (!cachedEntry) {
        refetch('foreground');
        return;
      }

      if (shouldRevalidateOnMount && isCacheEntryExpired(cachedEntry)) {
        void revalidate();
      }
    },
    [enabled, refetch, revalidate, syncStateWithCache]
  );

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'RESET' });
      return;
    }

    initializeQuery(revalidateOnMount);
  }, [enabled, revalidateOnMount, initializeQuery]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = clientCacheStore.subscribe(
      cacheKey,
      syncStateWithCache
    );

    return unsubscribe;
  }, [cacheKey, enabled, syncStateWithCache]);

  useEffect(() => {
    if (!enabled || !revalidateOnWindowFocus) return;

    const handleWindowFocus = () => {
      void revalidate();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [enabled, revalidateOnWindowFocus, revalidate]);

  const selectedData = useMemo(() => {
    if (state.data === undefined) return undefined as unknown as TSelectedData;
    return select
      ? select(state.data)
      : (state.data as unknown as TSelectedData);
  }, [state.data, select]);

  const derivedIsPending =
    (!enabled && state.data === undefined) || state.isPending;

  return {
    data: selectedData,
    headers: state.headers,
    error: state.error,
    isPending: !!derivedIsPending,
    isPendingBackground: state.isPendingBackground,
    isSuccess: state.isSuccess,
    isError: state.isError,
    revalidate,
    refetch,
  } as UseNexusQueryResult<TSelectedData>;
};
