import type {
  CacheEvent,
  EventStream,
  RequestEvent,
  Unsubscribe,
} from '@/types/debug';
import { logger } from '@/utils/logger';
import { getCurrentTimestamp } from '@/utils/timeUtils';

export const createEventStream = <T>(): EventStream<T> => {
  const handlers = new Set<(event: T) => void>();

  const subscribe = (handler: (event: T) => void): Unsubscribe => {
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
    };
  };

  const publish = (event: T): void => {
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        logger.error('[Cache] Event handler error', error);
      }
    });
  };

  const clear = (): void => {
    handlers.clear();
  };

  return { subscribe, publish, clear };
};

export const createCacheEvent = (
  cacheEvent: Omit<CacheEvent, 'timestamp'>
): CacheEvent => ({
  ...cacheEvent,
  timestamp: getCurrentTimestamp(),
});

export const createRequestEvent = (
  requestEvent: Omit<RequestEvent, 'timestamp'>
): RequestEvent => ({
  ...requestEvent,
  timestamp: getCurrentTimestamp(),
});
