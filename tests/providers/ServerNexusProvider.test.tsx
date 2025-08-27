import React from 'react';

describe('ServerNexusProvider (unit)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('wraps children and includes HydrationScript element', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        jest.doMock('@/scope/requestScopeStore', () => ({
          requestScopeStore: {
            runWith: async (cb: any) => cb(),
          },
        }));
        jest.doMock('@/scope/notModifiedContext', () => ({
          runWithNotModifiedContext: (cb: any) => cb(),
        }));

        const mod = require('@/providers/ServerNexusProvider');
        const ServerNexusProvider = mod.default as (props: {
          children: React.ReactNode;
        }) => Promise<React.ReactElement<{ children?: React.ReactNode }>>;

        const child = <span data-testid='child'>child</span>;
        const element = await ServerNexusProvider({ children: child });

        expect(element.type).toBe(React.Fragment);
        const fragment = element as React.ReactElement<{
          children?: React.ReactNode;
        }>;
        const [first, second] = React.Children.toArray(fragment.props.children);
        expect((first as any).props['data-testid']).toBe('child');
        const compType = (second as any).type;
        expect(typeof compType).toBe('function');
        expect(compType.name).toBe('HydrationScript');
        resolve();
      });
    });
  });

  it('HydrationScript renders script element with serialized payload', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        jest.doMock('@/scope/notModifiedContext', () => ({
          runWithNotModifiedContext: (cb: any) => cb(),
          getNotModifiedKeys: () => ['k2'],
        }));
        jest.doMock('@/scope/requestScopeStore', () => ({
          requestScopeStore: {
            runWith: async (cb: any) => cb(),
            keys: async () => ['k1'],
            get: async () => ({
              data: { ok: true },
              clientRevalidate: 30,
              clientTags: ['c'],
              serverTags: ['s'],
              etag: 'W/"x"',
              headers: { etag: 'W/"x"' },
            }),
          },
        }));

        const ServerNexusProvider = require('@/providers/ServerNexusProvider')
          .default as (props: {
          children: React.ReactNode;
        }) => Promise<React.ReactElement>;
        const element = await ServerNexusProvider({ children: <span /> });
        const fragment = element as React.ReactElement<{
          children?: React.ReactNode;
        }>;
        const second = React.Children.toArray(
          fragment.props.children
        )[1] as any;
        const scriptEl = await (second.type as any)();
        expect(scriptEl && scriptEl.type).toBe('script');
        const html: string = scriptEl.props.dangerouslySetInnerHTML.__html;
        const match = html.match(/window.__NEXUS_PAYLOAD__\s*=\s*(.*)/);
        expect(match).toBeTruthy();
        const jsonStr = match![1].trim().replace(/;$/, '');
        const payload = JSON.parse(jsonStr);
        expect(payload.notModifiedKeys).toEqual(['k2']);
        expect(payload.hydrationData['k1'].data).toEqual({ ok: true });
        resolve();
      });
    });
  });
});
