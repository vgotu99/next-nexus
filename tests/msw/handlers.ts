import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://example.com/health', () =>
    HttpResponse.json({ status: 'ok' })
  ),

  http.get(/\/api\/.*/, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ ok: true, path: url.pathname });
  }),
];

