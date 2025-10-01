'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo, useReducer, useEffect } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { executeQueryOnce } from '@/hooks/core/queryExecute';
import { validateQueryDefinition } from '@/hooks/core/queryValidator';
import {
  useQueryOnMount,
  useQueryOnWindowFocus,
} from '@/hooks/core/useQueryEvent';
import { useStableSelect } from '@/hooks/core/useStableSelect';
import type { ClientCacheEntry } from '@/types/cache';
import type { NexusDefinition } from '@/types/definition';
import type {
  NexusQueryState,
  QueryRefetchMode,
  UseNexusQueryOptions,
  UseNexusQueryResult,
} from '@/types/hooks';
import {
  generateCacheKeyFromDefinition,
  isCacheEntryExpired,
} from '@/utils/cacheUtils';

type QueryAction<TData> =
  | { type: 'SET_RESULT'; payload: { data: TData; headers: Headers } }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'START_FETCH'; payload: { mode: QueryRefetchMode } }
  | { type: 'RESET' };

const initialState = {
  data: undefined,
  headers: undefined,
  error: null,
  isPending: false,
  isPendingBackground: false,
  isSuccess: false,
  isError: false,
};

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
      return initialState;
    default:
      return state;
  }
};

export const useNexusQuery = <TData = unknown, TSelectedData = TData>(
  definition: NexusDefinition<TData>,
  options: UseNexusQueryOptions<TData, TSelectedData> = {}
): UseNexusQueryResult<TSelectedData> => {
  const {
    route,
    enabled = true,
    select,
    revalidateOnWindowFocus = true,
    revalidateOnMount = true,
    keepStaleData = true,
  } = options;

  const [state, dispatch] = useReducer(queryReducer<TData>, initialState);

  const cacheKey = useMemo(() => {
    const validDefinition = validateQueryDefinition(
      definition,
      'useNexusQuery'
    );

    return generateCacheKeyFromDefinition(validDefinition);
  }, [definition]);

  const pathname = usePathname();

  const getDefaultMode = useCallback((): QueryRefetchMode => {
    const cachedEntry = clientCacheStore.get(cacheKey);

    if (!cachedEntry) return 'foreground';

    const isExpired = isCacheEntryExpired(cachedEntry);
    const modeByKeepStaleData = keepStaleData ? 'background' : 'foreground';

    return isExpired ? modeByKeepStaleData : 'background';
  }, [cacheKey, keepStaleData]);

  const runFetch = useCallback(
    async (mode: QueryRefetchMode): Promise<void> => {
      dispatch({ type: 'START_FETCH', payload: { mode } });

      try {
        const { data, headers } = await executeQueryOnce<TData>(
          cacheKey,
          definition,
          pathname,
          route
        );

        dispatch({
          type: 'SET_RESULT',
          payload: { data, headers },
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
    [cacheKey, definition, pathname, route]
  );

  const syncStateWithCache = useCallback((): ClientCacheEntry<TData> | null => {
    const cachedEntry = clientCacheStore.getWithTracking<TData>(cacheKey);

    if (!cachedEntry) {
      dispatch({ type: 'RESET' });

      return null;
    }

    const isExpired = isCacheEntryExpired(cachedEntry);

    if (!isExpired || keepStaleData) {
      dispatch({
        type: 'SET_RESULT',
        payload: {
          data: cachedEntry.data,
          headers: new Headers(cachedEntry.headers || {}),
        },
      });
    } else {
      dispatch({ type: 'RESET' });

      return null;
    }

    return cachedEntry;
  }, [cacheKey, keepStaleData]);

  const initializeQuery = useCallback(
    (shouldRevalidate: boolean): void => {
      const cachedEntry = syncStateWithCache();

      if (!enabled) return;

      const defaultMode = getDefaultMode();

      if (!cachedEntry) {
        void runFetch(defaultMode);

        return;
      }

      if (shouldRevalidate && isCacheEntryExpired(cachedEntry)) {
        void runFetch(defaultMode);
      }
    },
    [enabled, runFetch, syncStateWithCache, getDefaultMode]
  );

  const revalidate = useCallback(async (): Promise<void> => {
    const cachedEntry = clientCacheStore.get(cacheKey);
    const defaultMode = getDefaultMode();

    if (!cachedEntry) {
      void runFetch(defaultMode);

      return;
    }

    if (!isCacheEntryExpired(cachedEntry)) return;

    await runFetch(defaultMode);
  }, [cacheKey, getDefaultMode, runFetch]);

  useQueryOnMount(() => {
    initializeQuery(revalidateOnMount);
  }, [initializeQuery, revalidateOnMount]);

  useQueryOnWindowFocus(() => {
    initializeQuery(revalidateOnWindowFocus);
  }, [initializeQuery, revalidateOnWindowFocus]);

  useEffect(() => {
    const unsubscribe = clientCacheStore.subscribe(
      cacheKey,
      syncStateWithCache
    );

    return unsubscribe;
  }, [cacheKey, syncStateWithCache]);

  const selectedData = useStableSelect<TData, TSelectedData>(
    state.data,
    select
  );

  const isPending = state.isPending;

  return {
    data: selectedData,
    headers: state.headers,
    error: state.error,
    isPending,
    isPendingBackground: state.isPendingBackground,
    isSuccess: state.isSuccess,
    isError: state.isError,
    revalidate,
  };
};
