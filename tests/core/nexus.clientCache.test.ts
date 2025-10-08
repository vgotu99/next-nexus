import { http, HttpResponse } from 'msw';

import { nexus } from '@/core/nexus';

import { server } from '../setup';

describe('nexus - basic GET (client cache behavior not supported here)', () => {
  it('returns data from MSW handler', async () => {
    server.use(
      http.get('http://localhost/api/hello', () =>
        HttpResponse.json({ ok: true, path: '/api/hello' }, { status: 200 })
      )
    );

    const res = await nexus<{ ok: boolean; path: string }>({
      method: 'GET',
      baseURL: 'http://localhost',
      endpoint: '/api/hello',
      interceptors: [],
    } as const);

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true, path: '/api/hello' });
    const cloned = res.clone();
    expect(cloned.data).toEqual({ ok: true, path: '/api/hello' });
  });
});
