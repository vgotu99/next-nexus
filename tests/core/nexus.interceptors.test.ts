import { http, HttpResponse } from 'msw';

import { interceptors, nexus } from '@/core/client';

import { server } from '../setup';

interface Data {
  ok: boolean;
  path: string;
  extra?: number;
}

describe('nexus + global interceptors integration', () => {
  it('applies named request/response interceptors registered globally', async () => {
    interceptors.request.use('add-header', async config => ({
      ...config,
      headers: {
        ...(config.headers as Record<string, string> | undefined),
        'x-added': '1',
      },
    }));

    interceptors.response.use('add-extra', async res => ({
      ...res,
      data: { ...(res.data as object), extra: 42 } as any,
    }));

    server.use(
      http.get('http://localhost/api/with-interceptors', ({ request }) => {
        const hasHeader = request.headers.get('x-added') === '1';
        return HttpResponse.json({
          ok: hasHeader,
          path: '/api/with-interceptors',
        });
      })
    );

    const res = await nexus<Data>({
      method: 'GET',
      baseURL: 'http://localhost',
      endpoint: '/api/with-interceptors',
      interceptors: ['add-header', 'add-extra'],
    } as const);

    expect(res.data).toEqual({
      ok: true,
      path: '/api/with-interceptors',
      extra: 42,
    });
  });
});
