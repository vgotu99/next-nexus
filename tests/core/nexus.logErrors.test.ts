import { http, HttpResponse } from 'msw';

import { server } from '../setup';

describe('nexus logging error paths', () => {
  it('tracks request error for non-timeout thrown error in retry', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        const trackRequestError = jest.fn();
        jest.doMock('@/debug/tracker', () => ({
          trackCache: jest.fn(),
          trackRequestStart: jest.fn(() => performance.now()),
          trackRequestSuccess: jest.fn(),
          trackRequestError,
          trackRequestTimeout: jest.fn(),
        }));

        jest.doMock('@/utils/retry', () => ({
          retry: async () => {
            throw new Error('boom');
          },
        }));

        const { nexus } = require('@/core/client');
        await expect(
          nexus({
            method: 'GET',
            baseURL: 'http://localhost',
            endpoint: '/noop',
            interceptors: [],
          } as const)
        ).rejects.toThrow('boom');
        expect(trackRequestError).toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('handles server env with no inbound headers (no hydration branch)', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(async () => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isServerEnvironment: () => true,
          isClientEnvironment: () => false,
          isDevelopment: () => false,
        }));
        jest.doMock('next/headers', () => ({
          headers: async () => {
            throw new Error('no headers');
          },
        }));
        jest.doMock('@/utils/retry', () => jest.requireActual('@/utils/retry'));

        server.use(
          http.get('http://localhost/api/ok', () =>
            HttpResponse.json({ ok: true }, { status: 200 })
          )
        );

        const { nexus } = require('@/core/client');
        const res = await nexus({
          method: 'GET',
          baseURL: 'http://localhost',
          endpoint: '/api/ok',
          interceptors: [],
          client: { revalidate: 10, tags: [] },
        } as const);
        expect(res.ok).toBe(true);
        resolve();
      });
    });
  });
});
