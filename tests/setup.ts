import { performance as nodePerformance } from 'node:perf_hooks';

import { setupServer } from 'msw/node';

import { handlers } from './msw/handlers';

if (!globalThis.performance) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).performance = nodePerformance as any;
}

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
