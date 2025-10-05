import {
  createEventStream,
  createCacheEvent,
  createRequestEvent,
} from '@/debug/eventStream';
import type { CacheEvent, RequestEvent } from '@/types/debug';
import { extractBaseKeyFromCacheKey } from '@/utils/cacheUtils';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';
import { msToSeconds } from '@/utils/timeUtils';

interface PublishRequestStart {
  url: string;
  method: string;
}

interface PublishRequestSuccess {
  url: string;
  method: string;
  startTime: number;
  status: number;
  responseSize?: number;
}

interface PublishRequestError {
  url: string;
  method: string;
  startTime: number;
  error: string;
}

interface PublishRequestTimeout {
  url: string;
  method: string;
  startTime: number;
}

const cacheEventStream = createEventStream<CacheEvent>();
const requestEventStream = createEventStream<RequestEvent>();

const logCacheEvent = (event: CacheEvent): void => {
  const {
    type,
    key,
    source,
    duration,
    status,
    tags,
    revalidate,
    ttl,
    size,
    maxSize,
  } = event;

  const sourceName = source.toUpperCase();

  const details: string[] = [];

  if (duration !== undefined) {
    details.push(`duration: ${msToSeconds(duration)}s`);
  }
  if (status !== undefined) {
    details.push(`status: ${status}`);
  }
  if (tags?.length) {
    details.push(`tags: [${tags.map(tag => `'${tag}'`).join(', ')}]`);
  }
  if (revalidate !== undefined) {
    details.push(`revalidate: ${revalidate}s`);
  }
  if (ttl !== undefined) {
    details.push(`ttl: ${ttl}s`);
  }
  if (size !== undefined && maxSize !== undefined) {
    details.push(`size: ${size}/${maxSize}`);
  }

  const message = [
    `[${sourceName}] [${type}] ${extractBaseKeyFromCacheKey(key)}`,
    ...(details.length > 0 ? [details.join(' | ')] : []),
  ].join(' | ');

  logger.debug(`[Cache] ${message}`);
};

const logRequestEvent = (event: RequestEvent): void => {
  const sourceName = isServerEnvironment() ? 'SERVER' : 'CLIENT';

  const { type, url, method, duration, status, error, responseSize } = event;

  const details: string[] = [];

  if (duration !== undefined) {
    details.push(`duration: ${msToSeconds(duration)}s`);
  }

  if (status !== undefined) {
    details.push(`status: ${status}`);
  }

  if (error !== undefined) {
    details.push(`error: ${error}`);
  }

  if (responseSize !== undefined) {
    details.push(`responseSize: ${responseSize}`);
  }

  const message = [
    `[${sourceName}] [${type}] ${method}: ${url}`,
    ...(details.length > 0 ? [details.join(' | ')] : []),
  ].join(' | ');

  logger.info(`[Request] ${message}`);
};

cacheEventStream.subscribe(logCacheEvent);
requestEventStream.subscribe(logRequestEvent);

const publishCacheEvent = (eventData: Omit<CacheEvent, 'timestamp'>): void => {
  const event = createCacheEvent(eventData);
  cacheEventStream.publish(event);
};

const publishRequestStart = ({ url, method }: PublishRequestStart): number => {
  const event = createRequestEvent({
    type: 'START',
    url,
    method,
  });
  requestEventStream.publish(event);
  return performance.now();
};

const publishRequestSuccess = ({
  url,
  method,
  startTime,
  status,
  responseSize,
}: PublishRequestSuccess): void => {
  const duration = performance.now() - startTime;
  const event = createRequestEvent({
    type: 'SUCCESS',
    url,
    method,
    duration,
    status,
    responseSize,
  });
  requestEventStream.publish(event);
};

const publishRequestError = ({
  url,
  method,
  startTime,
  error,
}: PublishRequestError): void => {
  const duration = performance.now() - startTime;
  const event = createRequestEvent({
    type: 'ERROR',
    url,
    method,
    duration,
    error,
  });
  requestEventStream.publish(event);
};

const publishRequestTimeout = ({
  url,
  method,
  startTime,
}: PublishRequestTimeout): void => {
  const duration = performance.now() - startTime;
  const event = createRequestEvent({
    type: 'TIMEOUT',
    url,
    method,
    duration,
  });
  requestEventStream.publish(event);
};

export const trackCache = publishCacheEvent;
export const trackRequestStart = publishRequestStart;
export const trackRequestSuccess = publishRequestSuccess;
export const trackRequestError = publishRequestError;
export const trackRequestTimeout = publishRequestTimeout;

export const subscribeToCacheEvents = cacheEventStream.subscribe;
export const subscribeToRequestEvents = requestEventStream.subscribe;
