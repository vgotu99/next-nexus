import { http, HttpResponse } from 'msw';

import { executeRequest } from '@/utils/executeRequest';

import { server } from '../setup';

describe('executeRequest - success', () => {
  it('returns InternalNexusResponse with parsed JSON data and supports clone()', async () => {
    server.use(
      http.get('http://localhost/api/greet', () =>
        HttpResponse.json({ ok: true, path: '/api/greet' }, { status: 200 })
      )
    );

    const req = new Request('http://localhost/api/greet');

    const res = await executeRequest<{ ok: boolean; path: string }>(req);

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true, path: '/api/greet' });

    const cloned = res.clone();
    expect(cloned.data).toEqual({ ok: true, path: '/api/greet' });
  });
});
