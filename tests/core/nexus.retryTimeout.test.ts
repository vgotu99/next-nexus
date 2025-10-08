import { http, HttpResponse } from 'msw';

import { ERROR_CODES } from '@/constants/errorCodes';
import { nexus } from '@/core/nexus';

import { server } from '../setup';

describe('nexus - retry and timeout scenarios', () => {
  it('retries on 500 and succeeds on a later attempt', async () => {
    let attempts = 0;
    server.use(
      http.get('http://localhost/api/flaky', () => {
        attempts += 1;
        if (attempts < 3) {
          return HttpResponse.json({ message: 'Internal' }, { status: 500 });
        }
        return HttpResponse.json(
          { ok: true, path: '/api/flaky' },
          { status: 200 }
        );
      })
    );

    const res = await nexus<{ ok: boolean; path: string }>({
      method: 'GET',
      baseURL: 'http://localhost',
      endpoint: '/api/flaky',
      interceptors: [],
      retry: { count: 2, delay: 0 },
      timeout: 1,
    } as const);

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true, path: '/api/flaky' });
  });

  it('retries on 429 and then succeeds', async () => {
    let attempts = 0;
    server.use(
      http.get('http://localhost/api/rate', () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { message: 'Too Many Requests' },
            { status: 429 }
          );
        }
        return HttpResponse.json(
          { ok: true, path: '/api/rate' },
          { status: 200 }
        );
      })
    );

    const res = await nexus<{ ok: boolean; path: string }>({
      method: 'GET',
      baseURL: 'http://localhost',
      endpoint: '/api/rate',
      interceptors: [],
      retry: { count: 1, delay: 0 },
      timeout: 1,
    } as const);

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true, path: '/api/rate' });
  });

  it('times out and exhausts retries, throwing TIMEOUT_ERROR', async () => {
    server.use(
      http.get('http://localhost/api/slow', () => new Promise(() => {}) as any)
    );

    await expect(
      nexus({
        method: 'GET',
        baseURL: 'http://localhost',
        endpoint: '/api/slow',
        interceptors: [],
        retry: { count: 2, delay: 0 },
        timeout: 0.05,
      } as const)
    ).rejects.toMatchObject({
      name: 'NexusError',
      code: ERROR_CODES.TIMEOUT_ERROR,
    });
  });
});
