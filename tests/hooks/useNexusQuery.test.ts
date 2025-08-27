/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { useNexusQuery } from '@/hooks/useNexusQuery';
import {
  generateCacheKeyFromDefinition,
  generateETag,
} from '@/utils/cacheUtils';

import { server } from '../setup';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('useNexusQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses cached data when present and refetchOnMount=false; refetch updates cache and state', async () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/query-cache',
      client: { revalidate: 120, tags: ['q1'], cachedHeaders: ['etag'] },
      interceptors: [],
    };

    const cacheKey = generateCacheKeyFromDefinition(def as any);

    clientCacheStore.set(cacheKey, {
      data: { ok: true, path: '/api/query-cache', from: 'cache' },
      clientRevalidate: 120,
      clientTags: ['q1'],
      serverTags: [],
      etag: undefined,
      headers: undefined,
      source: 'manual',
    });

    const { result } = renderHook(() =>
      useNexusQuery<any>(def as any, {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      })
    );

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toEqual({
      ok: true,
      path: '/api/query-cache',
      from: 'cache',
    });

    server.use(
      http.get('http://localhost/api/query-cache', () =>
        HttpResponse.json(
          { ok: true, path: '/api/query-cache', from: 'network' },
          { status: 200, headers: { etag: 'W/"net"' } }
        )
      )
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({
      ok: true,
      path: '/api/query-cache',
      from: 'network',
    });

    const updated = clientCacheStore.get<any>(cacheKey);
    expect(updated?.source).toBe('fetch');
    expect(updated?.headers?.etag).toBe('W/"net"');
  });

  it('fetches on mount when cache missing and writes ETag + cached headers into client cache', async () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/query-fetch',
      client: { revalidate: 60, tags: ['q2'], cachedHeaders: ['etag'] },
      interceptors: [],
    };

    const cacheKey = generateCacheKeyFromDefinition(def as any);

    server.use(
      http.get('http://localhost/api/query-fetch', () =>
        HttpResponse.json(
          { value: 42, label: 'answer' },
          { status: 200, headers: { etag: 'W/"etag-42"' } }
        )
      )
    );

    const { result } = renderHook(() => useNexusQuery<any>(def as any));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ value: 42, label: 'answer' });

    const entry = clientCacheStore.get<any>(cacheKey);
    expect(entry?.source).toBe('fetch');
    expect(entry?.etag).toBe(generateETag({ value: 42, label: 'answer' }));
    expect(entry?.headers?.etag).toBe('W/"etag-42"');
  });

  it('applies select option and respects route override', async () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/wrong',
      client: { revalidate: 30, tags: ['q3'] },
      interceptors: [],
    };

    server.use(
      http.get('http://localhost/api/query-select', () =>
        HttpResponse.json({ nested: { answer: 7 } })
      )
    );

    const { result } = renderHook(() =>
      useNexusQuery<{ nested: { answer: number } }, number>(def as any, {
        route: 'http://localhost/api/query-select',
        select: d => d.nested.answer,
      })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(7);
  });
});
