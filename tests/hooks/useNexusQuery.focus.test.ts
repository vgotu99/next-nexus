/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { clientCacheStore } from '@/cache/clientCacheStore';
import { useNexusQuery } from '@/hooks/useNexusQuery';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

import { server } from '../setup';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('useNexusQuery - refetch on window focus', () => {
  it('triggers network refetch on focus and updates cache', async () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/focus',
      client: { revalidate: 120, tags: ['focus'], cachedHeaders: ['etag'] },
      interceptors: [],
    };

    const cacheKey = generateCacheKeyFromDefinition(def as any);

    clientCacheStore.set(cacheKey, {
      data: { version: 1 },
      clientRevalidate: 120,
      clientTags: ['focus'],
      serverTags: [],
      source: 'manual',
    });

    server.use(
      http.get('http://localhost/api/focus', () =>
        HttpResponse.json(
          { version: 2 },
          { status: 200, headers: { etag: 'W/"v2"' } }
        )
      )
    );

    const { result } = renderHook(() =>
      useNexusQuery<any>(def as any, {
        route: 'http://localhost/api/focus',
        refetchOnMount: false,
        refetchOnWindowFocus: true,
      })
    );

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ version: 1 });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ version: 2 });

    const updated = clientCacheStore.get<any>(cacheKey);
    expect(updated?.source).toBe('fetch');
    expect(updated?.headers?.etag).toBe('W/"v2"');
  });
});
