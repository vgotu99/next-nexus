describe('NexusRenderer', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('renders client renderer for single definition when client cache meta is fresh', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        const def = {
          method: 'GET' as const,
          baseURL: 'http://localhost',
          endpoint: '/api/single',
        };

        const { generateCacheKeyFromDefinition } =
          require('@/utils/cacheUtils') as typeof import('@/utils/cacheUtils');
        const cacheKey = generateCacheKeyFromDefinition(def as any);

        jest.doMock('@/cache/serverCacheStateProcessor', () => ({
          extractClientCacheMetadataFromCookies: async () => [
            { ttl: 10, cacheKey, etag: 'W/"x"' },
          ],
          findExactClientCacheMetadata: (arr: any[], key: string) =>
            arr.find(a => a.cacheKey === key) ?? null,
        }));

        const releaseReservation = jest.fn();
        const reservePending = jest.fn();
        jest.doMock('@/scope/requestPendingStore', () => ({
          reservePending,
          releaseReservation,
        }));

        jest.doMock('@/components/ClientRenderer', () => {
          const SingleDefinitionClientRenderer = jest.fn(() => (
            <div data-testid='client' />
          ));
          const GroupDefinitionsClientRenderer = jest.fn(() => <div />);
          return {
            SingleDefinitionClientRenderer,
            GroupDefinitionsClientRenderer,
          };
        });
        jest.doMock('@/components/ServerRenderer', () => {
          const SingleDefinitionServerRenderer = jest.fn(() => (
            <div data-testid='server' />
          ));
          const GroupDefinitionsServerRenderer = jest.fn(() => <div />);
          return {
            SingleDefinitionServerRenderer,
            GroupDefinitionsServerRenderer,
          };
        });

        const { NexusRenderer } =
          require('@/components/NexusRenderer') as typeof import('@/components/NexusRenderer');

        const element = (
          <NexusRenderer
            definition={def as any}
            serverComponent={() => <div data-testid='server' />}
            clientComponent={() => <div data-testid='client' />}
          />
        );

        const out1 = await (element.type as any)(element.props);
        const out2 = await (out1.type as any)(out1.props);
        const out3 = await (out2.type as any)(out2.props);
        expect(out3.type).toBe('div');
        expect(out3.props['data-testid']).toBe('client');
        expect(releaseReservation).toHaveBeenCalled();
        expect(reservePending).toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('renders server renderer for single definition when meta missing or stale', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        const def = {
          method: 'GET' as const,
          baseURL: 'http://localhost',
          endpoint: '/api/single-stale',
        };
        const { generateCacheKeyFromDefinition } =
          require('@/utils/cacheUtils') as typeof import('@/utils/cacheUtils');
        const cacheKey = generateCacheKeyFromDefinition(def as any);

        jest.doMock('@/cache/serverCacheStateProcessor', () => ({
          extractClientCacheMetadataFromCookies: async () => [
            { ttl: 0, cacheKey },
          ],
          findExactClientCacheMetadata: (arr: any[], key: string) =>
            arr.find(a => a.cacheKey === key) ?? null,
        }));

        jest.doMock('@/scope/requestPendingStore', () => ({
          reservePending: jest.fn(),
          releaseReservation: jest.fn(),
        }));

        jest.doMock('@/components/ClientRenderer', () => {
          const SingleDefinitionClientRenderer = jest.fn(() => (
            <div data-testid='client' />
          ));
          const GroupDefinitionsClientRenderer = jest.fn(() => <div />);
          return {
            SingleDefinitionClientRenderer,
            GroupDefinitionsClientRenderer,
          };
        });
        jest.doMock('@/components/ServerRenderer', () => {
          const SingleDefinitionServerRenderer = jest.fn(() => (
            <div data-testid='server' />
          ));
          const GroupDefinitionsServerRenderer = jest.fn(() => <div />);
          return {
            SingleDefinitionServerRenderer,
            GroupDefinitionsServerRenderer,
          };
        });

        const { NexusRenderer } =
          require('@/components/NexusRenderer') as typeof import('@/components/NexusRenderer');

        const element = (
          <NexusRenderer
            definition={def as any}
            serverComponent={() => <div data-testid='server' />}
            clientComponent={() => <div data-testid='client' />}
          />
        );

        const out1 = await (element.type as any)(element.props);
        const out2 = await (out1.type as any)(out1.props);
        const out3 = await (out2.type as any)(out2.props);
        expect(out3.type).toBe('div');
        expect(out3.props['data-testid']).toBe('server');
        resolve();
      });
    });
  });

  it('group: renders client renderer when any meta is fresh and prefetches stale ones', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        const defs = {
          A: {
            method: 'GET' as const,
            baseURL: 'http://localhost',
            endpoint: '/api/a',
          },
          B: {
            method: 'GET' as const,
            baseURL: 'http://localhost',
            endpoint: '/api/b',
          },
        };
        const { generateCacheKeyFromDefinition } =
          require('@/utils/cacheUtils') as typeof import('@/utils/cacheUtils');
        const kA = generateCacheKeyFromDefinition(defs.A as any);
        const kB = generateCacheKeyFromDefinition(defs.B as any);

        jest.doMock('@/cache/serverCacheStateProcessor', () => ({
          extractClientCacheMetadataFromCookies: async () => [
            { ttl: 10, cacheKey: kA },
            { ttl: 0, cacheKey: kB },
          ],
          findExactClientCacheMetadata: (arr: any[], key: string) =>
            arr.find(a => a.cacheKey === key) ?? null,
        }));

        const nexus = jest.fn(async () => ({
          ok: true,
          status: 200,
          headers: new Headers(),
          data: {},
        }));
        jest.doMock('@/core/nexus', () => ({ nexus }));

        const releaseReservation = jest.fn();
        jest.doMock('@/scope/requestPendingStore', () => ({
          reservePending: jest.fn(),
          releaseReservation,
        }));

        jest.doMock('@/components/ClientRenderer', () => {
          const GroupDefinitionsClientRenderer = jest.fn(() => (
            <div data-testid='group-client' />
          ));
          const SingleDefinitionClientRenderer = jest.fn(() => <div />);
          return {
            GroupDefinitionsClientRenderer,
            SingleDefinitionClientRenderer,
          };
        });
        jest.doMock('@/components/ServerRenderer', () => {
          const GroupDefinitionsServerRenderer = jest.fn(() => (
            <div data-testid='group-server' />
          ));
          const SingleDefinitionServerRenderer = jest.fn(() => <div />);
          return {
            GroupDefinitionsServerRenderer,
            SingleDefinitionServerRenderer,
          };
        });

        const { NexusRenderer } =
          require('@/components/NexusRenderer') as typeof import('@/components/NexusRenderer');

        const element = (
          <NexusRenderer
            definitions={defs as any}
            serverComponent={() => <div data-testid='group-server' />}
            clientComponent={() => <div data-testid='group-client' />}
          />
        );

        const out1 = await (element.type as any)(element.props);
        const out2 = await (out1.type as any)(out1.props);
        const out3 = await (out2.type as any)(out2.props);
        expect(out3.type).toBe('div');
        expect(out3.props['data-testid']).toBe('group-client');
        expect(releaseReservation).toHaveBeenCalled();
        expect(nexus).toHaveBeenCalledTimes(1);
        resolve();
      });
    });
  });
});
