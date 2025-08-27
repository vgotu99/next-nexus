import { performance as nodePerformance } from 'node:perf_hooks';
import {
  ReadableStream as NodeReadableStream,
  TransformStream as NodeTransformStream,
  WritableStream as NodeWritableStream,
} from 'node:stream/web';
import {
  TextDecoder as NodeTextDecoder,
  TextEncoder as NodeTextEncoder,
} from 'node:util';
import { BroadcastChannel as NodeBroadcastChannel } from 'node:worker_threads';

import type { SetupServerApi } from 'msw/node';

// Ensure performance is available in both environments
if (!globalThis.performance) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).performance = nodePerformance as any;
}

// Polyfill TextEncoder/TextDecoder for jsdom
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextEncoder = NodeTextEncoder as any;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextDecoder = NodeTextDecoder as any;
}

// Polyfill Web Streams for jsdom
if (typeof (globalThis as any).TransformStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TransformStream = NodeTransformStream as any;
}
if (typeof (globalThis as any).ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ReadableStream = NodeReadableStream as any;
}
if (typeof (globalThis as any).WritableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WritableStream = NodeWritableStream as any;
}

// Polyfill BroadcastChannel for jsdom
if (typeof (globalThis as any).BroadcastChannel === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).BroadcastChannel = NodeBroadcastChannel as any;
}

// Polyfill fetch/Request/Response in jsdom so `msw/node` can operate consistently
const isJsdom =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';
if (isJsdom) {
  // Load browser-friendly WHATWG fetch polyfill for the JSDOM environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('whatwg-fetch');
}

// Dynamically import msw/node after polyfills are in place
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupServer } = require('msw/node') as {
  setupServer: (...handlers: any[]) => SetupServerApi;
};

// Initialize MSW server without default handlers.
// Each test should register the handlers it needs using `server.use(...)`.
export const server: SetupServerApi = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
