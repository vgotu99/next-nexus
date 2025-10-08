import { http, HttpResponse } from 'msw';

import { server } from '../setup';

describe('ServerRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SingleDefinitionServerRenderer fetches data and renders server component with props', async () => {
    const { SingleDefinitionServerRenderer } =
      require('@/components/ServerRenderer') as typeof import('@/components/ServerRenderer');

    server.use(
      http.get('http://localhost/api/srv-one', () =>
        HttpResponse.json({ ok: true }, { status: 200 })
      )
    );

    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/srv-one',
      interceptors: [],
    };

    const ServerComp = jest.fn(({ data }: { data: { ok: boolean } }) => (
      <div data-testid='srv-one'>{String(data.ok)}</div>
    ));

    const el = await SingleDefinitionServerRenderer({
      definition: def as any,
      serverComponent: ServerComp as any,
    });

    expect(el.type).toBe(ServerComp);
    expect(el.props.data).toEqual({ ok: true });
  });

  it('GroupDefinitionsServerRenderer fetches all and renders combined props', async () => {
    const { GroupDefinitionsServerRenderer } =
      require('@/components/ServerRenderer') as typeof import('@/components/ServerRenderer');

    server.use(
      http.get('http://localhost/api/srv-a', () => HttpResponse.json({ a: 1 })),
      http.get('http://localhost/api/srv-b', () => HttpResponse.json({ b: 2 }))
    );

    const defs = {
      A: {
        method: 'GET' as const,
        baseURL: 'http://localhost',
        endpoint: '/api/srv-a',
      },
      B: {
        method: 'GET' as const,
        baseURL: 'http://localhost',
        endpoint: '/api/srv-b',
      },
    };

    const ServerComp = jest.fn(({ data }: { data: Record<string, any> }) => (
      <div data-testid='srv-group'>{Object.keys(data).sort().join(',')}</div>
    ));

    const el = await GroupDefinitionsServerRenderer({
      definitions: defs as any,
      serverComponent: ServerComp as any,
    });

    expect(el.type).toBe(ServerComp);
    expect(el.props.data).toBeDefined();
  });
});
