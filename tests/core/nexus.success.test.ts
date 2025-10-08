import { http, HttpResponse } from 'msw';

import { nexus } from '@/core/nexus';

import { server } from '../setup';

interface Greet extends Record<string, unknown> {
  ok: boolean;
  path: string;
}

describe('nexus - GET success', () => {
  it('returns data from MSW handler', async () => {
    server.use(
      http.get('http://localhost/api/greet', () =>
        HttpResponse.json({ ok: true, path: '/api/greet' }, { status: 200 })
      )
    );

    const res = await nexus<Greet>({
      method: 'GET',
      baseURL: 'http://localhost',
      endpoint: '/api/greet',
      interceptors: [],
    } as const);

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true, path: '/api/greet' });
    const cloned = res.clone();
    expect(cloned.data).toEqual({ ok: true, path: '/api/greet' });
  });
});
