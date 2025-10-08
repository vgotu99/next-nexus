import React from 'react';

describe('NexusHydrationBoundary (server)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('wraps children and yields HydrationDispatcher when payload has content', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        jest.doMock('@/client/NexusHydrationDispatcher', () => ({
          NexusHydrationDispatcher: ({ payload }: any) => (
            <script
              data-testid='hydration'
              data-payload={JSON.stringify(payload)}
            />
          ),
        }));

        jest.doMock('@/scope/requestScopeStore', () => {
          const map = new Map<string, any>();
          map.set('K', {
            data: { ok: true },
            clientRevalidate: 60,
            clientTags: ['c'],
            serverTags: ['s'],
            etag: 'W/"x"',
            headers: { etag: 'W/"x"' },
          });
          return {
            requestScopeStore: {
              enter: jest.fn(),
              get: async (k: string) => map.get(k) ?? null,
              keys: async () => Array.from(map.keys()),
            },
          };
        });

        jest.doMock('@/scope/notModifiedContext', () => ({
          enterNotModifiedContext: jest.fn(),
          getNotModifiedKeys: () => ['K'],
        }));

        const markRenderSettled = jest.fn();
        jest.doMock('@/scope/requestPendingStore', () => ({
          enterPendingStore: jest.fn(),
          waitForAll: jest.fn().mockResolvedValue(undefined),
          markRenderSettled,
        }));

        jest.doMock('next/headers', () => ({
          cookies: async () => ({
            get: (name: string) =>
              name === '__NEXUS_PATHNAME__' ? { value: '/p' } : undefined,
          }),
        }));

        const mod = require('@/server/NexusHydrationBoundary');
        const { NexusHydrationBoundary } =
          mod as typeof import('@/server/NexusHydrationBoundary');

        const element = (
          <NexusHydrationBoundary>
            <span data-testid='child'>child</span>
          </NexusHydrationBoundary>
        );

        const out = await (element.type as any)(element.props);
        expect(out.type).toBe(React.Fragment);
        const arr = React.Children.toArray(out.props.children) as any[];
        expect(arr.length).toBe(2);
        expect(arr[0].props['data-testid']).toBe('child');

        const suspenseEl = arr[1];
        const suspenseChildren = React.Children.toArray(
          suspenseEl.props.children
        ) as any[];
        expect(suspenseChildren.length).toBe(2);

        await (suspenseChildren[0].type as any)();
        expect(markRenderSettled).toHaveBeenCalled();

        const scriptOut = await (suspenseChildren[1].type as any)();
        const dispOut = (scriptOut.type as any)(scriptOut.props);
        expect(dispOut.type).toBe('script');
        const payload = JSON.parse(dispOut.props['data-payload']);
        expect(payload.pathname).toBe('/p');
        expect(Object.keys(payload.hydrationData)).toContain('K');
        expect(payload.notModifiedKeys).toEqual(['K']);
        resolve();
      });
    });
  });
});
