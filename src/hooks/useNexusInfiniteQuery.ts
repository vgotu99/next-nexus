'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { executeQueryOnce } from '@/hooks/core/queryExecute';
import { validateQueryDefinition } from '@/hooks/core/queryValidator';
import {
  useQueryOnMount,
  useQueryOnWindowFocus,
} from '@/hooks/core/useQueryEvent';
import { useStableArraySelect } from '@/hooks/core/useStableArraySelect';
import { useStableSelect } from '@/hooks/core/useStableSelect';
import type { ClientCacheEntry } from '@/types/cache';
import type { NexusDefinition } from '@/types/definition';
import type {
  NexusInfiniteQueryState,
  QueryRefetchMode,
  UseNexusInfiniteQueryOptions,
  UseNexusInfiniteQueryResult,
} from '@/types/hooks';
import {
  generateCacheKeyFromDefinition,
  isCacheEntryExpired,
} from '@/utils/cacheUtils';

type InfiniteQueryAction<TPage, TParam> =
  | { type: 'RESET' }
  | {
      type: 'INIT_FROM_CACHE';
      payload: { page: TPage; param: TParam; headers?: Headers };
    }
  | { type: 'START_FETCH'; payload: { mode: QueryRefetchMode } }
  | { type: 'END_FETCH'; payload: { mode: QueryRefetchMode } }
  | {
      type: 'APPEND';
      payload: {
        page: TPage;
        param: TParam;
        headers?: Headers;
        keepPages?: number;
      };
    }
  | {
      type: 'REPLACE';
      payload: { index: number; page: TPage; param: TParam; headers?: Headers };
    }
  | { type: 'SET_ERROR'; payload: Error | null };

const initialState = {
  data: undefined,
  headers: undefined,
  error: null,
  pendingCount: 0,
  pendingBackgroundCount: 0,
  isSuccess: false,
  isError: false,
};

function infiniteQueryReducer<TPage, TParam>(
  state: NexusInfiniteQueryState<TPage, TParam>,
  action: InfiniteQueryAction<TPage, TParam>
): NexusInfiniteQueryState<TPage, TParam> {
  switch (action.type) {
    case 'INIT_FROM_CACHE':
      return {
        ...state,
        data: {
          pages: [action.payload.page],
          pageParams: [action.payload.param],
        },
        headers: action.payload.headers ?? state.headers,
        error: null,
        isSuccess: true,
        isError: false,
      };
    case 'START_FETCH':
      return {
        ...state,
        pendingCount:
          action.payload.mode === 'foreground'
            ? state.pendingCount + 1
            : state.pendingCount,
        pendingBackgroundCount:
          action.payload.mode === 'background'
            ? state.pendingBackgroundCount + 1
            : state.pendingBackgroundCount,
      };
    case 'END_FETCH':
      return {
        ...state,
        pendingCount:
          action.payload.mode === 'foreground'
            ? Math.max(0, state.pendingCount - 1)
            : state.pendingCount,
        pendingBackgroundCount:
          action.payload.mode === 'background'
            ? Math.max(0, state.pendingBackgroundCount - 1)
            : state.pendingBackgroundCount,
      };
    case 'APPEND': {
      const prevPages = state.data?.pages ?? [];
      const prevParams = state.data?.pageParams ?? [];
      const nextPages = [...prevPages, action.payload.page];
      const nextParams = [...prevParams, action.payload.param];
      const keep = action.payload.keepPages;
      const start =
        keep && nextPages.length > keep ? nextPages.length - keep : 0;
      const pages = nextPages.slice(start);
      const pageParams = nextParams.slice(start);

      return {
        ...state,
        data: { pages, pageParams },
        headers: action.payload.headers ?? state.headers,
        error: null,
        isSuccess: true,
        isError: false,
      };
    }
    case 'REPLACE': {
      const total = state.data?.pages.length ?? 0;
      if (action.payload.index < 0 || action.payload.index >= total)
        return state;
      const pages = [...(state.data?.pages ?? [])];
      const pageParams = [...(state.data?.pageParams ?? [])];
      pages[action.payload.index] = action.payload.page;
      pageParams[action.payload.index] = action.payload.param;

      return {
        ...state,
        data: { pages, pageParams },
        headers: action.payload.headers ?? state.headers,
        error: null,
        isSuccess: true,
        isError: false,
      };
    }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isError: !!action.payload,
        isSuccess: false,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export const useNexusInfiniteQuery = <
  TPage = unknown,
  TParam = unknown,
  TSelected = TPage,
>(
  getDefinition: (param: TParam) => NexusDefinition<TPage>,
  options: UseNexusInfiniteQueryOptions<TPage, TParam, TSelected>
): UseNexusInfiniteQueryResult<TSelected, TParam> => {
  const {
    initialPageParam,
    getNextPageParam,
    prefetchNextOnNearViewport,
    keepPages,
    enabled = true,
    route,
    select,
    revalidateOnMount = true,
    revalidateOnWindowFocus = false,
    keepStaleData = true,
  } = options;

  const [state, dispatch] = useReducer(
    infiniteQueryReducer<TPage, TParam>,
    initialState
  );

  const rawPages = useMemo(() => state.data?.pages ?? [], [state.data]);
  const rawPageParams = useMemo(
    () => state.data?.pageParams ?? [],
    [state.data]
  );
  const hasNextPage = useMemo(() => {
    if (rawPages.length === 0) return true;

    const last = rawPages[rawPages.length - 1];

    return getNextPageParam(last, rawPages) !== null;
  }, [getNextPageParam, rawPages]);

  const makeCacheKey = useCallback(
    (param: TParam) => {
      const definition = getDefinition(param);
      const validDefinition = validateQueryDefinition(
        definition,
        'useNexusInfiniteQuery'
      );

      return generateCacheKeyFromDefinition(validDefinition);
    },
    [getDefinition]
  );

  const pathname = usePathname();

  const runFetch = useCallback(
    async (
      param: TParam,
      mode: QueryRefetchMode,
      replaceIndex?: number
    ): Promise<void> => {
      const cacheKey = makeCacheKey(param);

      dispatch({ type: 'START_FETCH', payload: { mode } });

      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const { data, headers } = await executeQueryOnce<TPage>(
          cacheKey,
          getDefinition(param),
          pathname,
          route
        );

        if (typeof replaceIndex === 'number') {
          dispatch({
            type: 'REPLACE',
            payload: { index: replaceIndex, page: data, param, headers },
          });
        } else {
          dispatch({
            type: 'APPEND',
            payload: { page: data, param, headers, keepPages },
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({
          type: 'SET_ERROR',
          payload: new Error(`useNexusInfiniteQuery failed: ${err.message}`),
        });
      } finally {
        dispatch({ type: 'END_FETCH', payload: { mode } });
      }
    },
    [getDefinition, keepPages, makeCacheKey, pathname, route]
  );
  const getDefaultMode = useCallback((): QueryRefetchMode => {
    const cacheKey = makeCacheKey(rawPageParams[rawPageParams.length - 1]);
    const cachedEntry = clientCacheStore.get<TPage>(cacheKey);

    if (!cachedEntry) {
      return 'foreground';
    }

    const isExpired = isCacheEntryExpired(cachedEntry);

    const modeByKeepStaleData = keepStaleData ? 'background' : 'foreground';

    return isExpired ? modeByKeepStaleData : 'background';
  }, [makeCacheKey, rawPageParams, keepStaleData]);

  const materializePage = useCallback(
    async (
      param: TParam,
      mode?: QueryRefetchMode,
      replaceIndex?: number,
      force?: boolean
    ) => {
      const cacheKey = makeCacheKey(param);
      const cachedEntry = clientCacheStore.get<TPage>(cacheKey);
      const defaultMode = getDefaultMode();

      if (cachedEntry) {
        const expired = isCacheEntryExpired(cachedEntry);
        const shouldDisplay = !expired || keepStaleData;

        if (shouldDisplay) {
          const headers = new Headers(cachedEntry.headers || {});

          if (typeof replaceIndex === 'number') {
            dispatch({
              type: 'REPLACE',
              payload: {
                index: replaceIndex,
                page: cachedEntry.data,
                param,
                headers,
              },
            });
          } else {
            dispatch({
              type: 'APPEND',
              payload: { page: cachedEntry.data, param, headers, keepPages },
            });
          }
        }

        if (!enabled) return;

        const finalMode: QueryRefetchMode = mode ?? defaultMode;

        if (force || expired) {
          await runFetch(param, finalMode, replaceIndex);
        }
        return;
      }

      if (!enabled) return;

      const finalMode: QueryRefetchMode = mode ?? defaultMode;

      await runFetch(param, finalMode, replaceIndex);
    },
    [enabled, keepPages, keepStaleData, makeCacheKey, runFetch, getDefaultMode]
  );

  const revalidateNext = useCallback(async (): Promise<void> => {
    const isFirst = rawPages.length === 0;
    const nextParam = isFirst
      ? initialPageParam
      : getNextPageParam(rawPages[rawPages.length - 1], rawPages);

    if (nextParam == null) return;

    const cacheKey = makeCacheKey(nextParam);
    const cachedEntry = clientCacheStore.get<TPage>(cacheKey);
    const mode: QueryRefetchMode = cachedEntry ? 'background' : 'foreground';

    await materializePage(nextParam, mode, undefined, false);
  }, [
    getNextPageParam,
    initialPageParam,
    makeCacheKey,
    materializePage,
    rawPages,
  ]);

  const refetchNext = useCallback(
    async (mode?: QueryRefetchMode): Promise<void> => {
      const isFirst = rawPages.length === 0;
      const nextParam = isFirst
        ? initialPageParam
        : getNextPageParam(rawPages[rawPages.length - 1], rawPages);
      if (nextParam == null) return;
      const finalMode: QueryRefetchMode = mode ?? 'foreground';
      await materializePage(nextParam, finalMode, undefined, true);
    },
    [getNextPageParam, initialPageParam, materializePage, rawPages]
  );

  const syncStateWithCache = useCallback((): ClientCacheEntry<TPage> | null => {
    const firstKey = makeCacheKey(initialPageParam);
    const cachedEntry = clientCacheStore.getWithTracking<TPage>(firstKey);

    if (rawPages.length !== 0) return null;

    if (!cachedEntry) {
      dispatch({ type: 'RESET' });

      return null;
    }

    const isExpired = isCacheEntryExpired(cachedEntry);

    if (!isExpired || keepStaleData) {
      dispatch({
        type: 'INIT_FROM_CACHE',
        payload: {
          page: cachedEntry.data,
          param: initialPageParam,
          headers: new Headers(cachedEntry.headers || {}),
        },
      });
    } else {
      dispatch({ type: 'RESET' });

      return null;
    }

    return cachedEntry;
  }, [initialPageParam, makeCacheKey, rawPages.length, keepStaleData]);

  const initializeQuery = useCallback(
    (shouldRevalidate: boolean): void => {
      const cachedEntry = syncStateWithCache();

      if (!enabled) return;

      if (rawPages.length !== 0) return;

      if (!cachedEntry) {
        void runFetch(initialPageParam, 'foreground');
        return;
      }

      if (shouldRevalidate) {
        void runFetch(initialPageParam, 'background', 0);
      }
    },
    [enabled, initialPageParam, runFetch, syncStateWithCache, rawPages.length]
  );

  useQueryOnMount(() => initializeQuery(revalidateOnMount));

  useQueryOnWindowFocus(() => initializeQuery(revalidateOnWindowFocus));

  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchElementRef = useRef<Element | null>(null);
  const prefetchRef = useCallback((el: Element | null) => {
    prefetchElementRef.current = el;
  }, []);

  useEffect(() => {
    const cfg = prefetchNextOnNearViewport;
    if (!enabled || !hasNextPage || !cfg) return;

    const rootMargin = cfg.rootMargin;
    const threshold = cfg.threshold;
    const strategy = cfg.strategy ?? 'revalidate';
    const defaultMode: QueryRefetchMode =
      strategy === 'revalidate' ? 'background' : 'foreground';
    const mode: QueryRefetchMode = cfg.mode ?? defaultMode;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const element = prefetchElementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        if (strategy === 'revalidate') {
          void revalidateNext();
        } else {
          void refetchNext(mode);
        }
      },
      { root: null, rootMargin, threshold }
    );

    observerRef.current = observer;
    observer.observe(element);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [
    enabled,
    hasNextPage,
    prefetchNextOnNearViewport,
    revalidateNext,
    refetchNext,
  ]);

  const selectedPages = useStableArraySelect<TPage, TSelected>(
    rawPages,
    select
  );
  const selectedData = useStableSelect<
    TSelected[] | undefined,
    { pages: TSelected[]; pageParams: TParam[] } | undefined
  >(selectedPages, pages =>
    pages && pages.length === 0 && rawPageParams.length === 0
      ? undefined
      : { pages: pages ?? [], pageParams: rawPageParams }
  );
  const isPending =
    (!enabled && rawPages.length === 0) || state.pendingCount > 0;

  return {
    data: selectedData,
    headers: state.headers,
    error: state.error,
    isPending,
    isPendingBackground: state.pendingBackgroundCount > 0,
    isSuccess: state.isSuccess,
    isError: state.isError,
    hasNextPage,
    revalidateNext,
    refetchNext,
    prefetchRef: prefetchNextOnNearViewport ? prefetchRef : undefined,
  };
};
