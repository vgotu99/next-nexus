import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { useNexusInfiniteQuery } from '@/hooks/useNexusInfiniteQuery';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

import { server } from '../setup';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/app',
}));

describe('useNexusInfiniteQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes from cache when present and appends next page via revalidateNext', async () => {
    const getDefinition = (p: number) => ({
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: `/api/inf?p=${p}`,
      client: { revalidate: 60, tags: ['inf'] },
      interceptors: [],
    });

    const key1 = generateCacheKeyFromDefinition(getDefinition(1) as any);
    clientCacheStore.set(key1, {
      data: { items: [1], next: 2 },
      clientRevalidate: 60,
      clientTags: ['inf'],
      serverTags: [],
      source: 'manual',
    });

    server.use(
      http.get('http://localhost/api/inf', ({ request }) => {
        const url = new URL(request.url);
        const p = url.searchParams.get('p');
        if (p === '2') {
          return HttpResponse.json(
            { items: [2], next: null },
            {
              headers: { etag: 'W/"p2"' },
            }
          );
        }
        return HttpResponse.json(
          { items: [1], next: 2 },
          {
            headers: { etag: 'W/"p1"' },
          }
        );
      })
    );

    const { result } = renderHook(() =>
      useNexusInfiniteQuery<
        { items: number[]; next: number | null },
        number,
        number[]
      >(getDefinition as any, {
        initialPageParam: 1,
        getNextPageParam: last => last.next,
        select: page => page.items,
      })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toEqual([[1]]);

    await act(async () => {
      await result.current.revalidateNext();
    });

    await waitFor(() => expect(result.current.data?.pages).toEqual([[1], [2]]));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('prefetches next page when element intersects viewport via prefetchRef', async () => {
    const getDefinition = (p: number) => ({
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: `/api/inf2?p=${p}`,
      client: { revalidate: 0, tags: [] },
      interceptors: [],
    });

    server.use(
      http.get('http://localhost/api/inf2', ({ request }) => {
        const url = new URL(request.url);
        const p = Number(url.searchParams.get('p'));
        const next = p === 1 ? 2 : null;
        return HttpResponse.json(
          { items: [p], next },
          { headers: { etag: `W/"${p}"` } }
        );
      })
    );

    const callbacks: Array<(entries: any[]) => void> = [];
    (global as any).IntersectionObserver = class {
      cb: any;
      constructor(cb: any) {
        this.cb = cb;
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    } as any;

    const { result, rerender } = renderHook(
      (opts: {
        initialPageParam: number;
        getNextPageParam: (last: {
          items: number[];
          next: number | null;
        }) => number | null;
        prefetchNextOnNearViewport: { rootMargin: string; threshold: number };
      }) =>
        useNexusInfiniteQuery<{ items: number[]; next: number | null }, number>(
          getDefinition as any,
          opts as any
        ),
      {
        initialProps: {
          initialPageParam: 1,
          getNextPageParam: (last: { items: number[]; next: number | null }) =>
            last.next,
          prefetchNextOnNearViewport: { rootMargin: '0px', threshold: 0 },
        },
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages.length).toBe(1);

    const el = document.createElement('div');
    result.current.prefetchRef?.(el);

    rerender({
      initialPageParam: 1,
      getNextPageParam: (last: { items: number[]; next: number | null }) =>
        last.next,
      prefetchNextOnNearViewport: { rootMargin: '0px', threshold: 0 },
    });

    act(() => {
      callbacks.forEach(cb => cb([{ isIntersecting: true }] as any));
    });

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));
  });
});
