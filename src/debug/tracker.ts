import {
  createEventStream,
  createCacheEvent,
  createRequestEvent,
} from '@/debug/eventStream';
import type { CacheEvent, RequestEvent } from '@/types/debug';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';
import { msToSeconds } from '@/utils/timeUtils';

interface PublishRequestStartParams {
  url: string;
  method: string;
}

interface PublishRequestSuccessParams {
  url: string;
  method: string;
  duration: number;
  status: number;
  responseSize?: number;
}

interface PublishRequestErrorParams {
  url: string;
  method: string;
  duration: number;
  error: string;
}

interface PublishRequestTimeoutParams {
  url: string;
  method: string;
  duration: number;
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
    `[${sourceName}] [${type}] ${key}`,
    ...(details.length > 0 ? [details.join(' | ')] : []),
  ].join(' | ');

  logger.debug('Cache', message);
};

const logRequestEvent = (event: RequestEvent): void => {
  const sourceName = isServerEnvironment() ? 'SERVER' : 'CLIENT';

  const { type, url, method, duration, status, error, responseSize } = event;

  const details: string[] = [];

  if (duration !== undefined) {
    details.push(`duration: ${msToSeconds(duration)}s`);
  }

  if (status !== undefined) {
    details.push(`status: ${status})}`);
  }

  if (error !== undefined) {
    details.push(`error: ${error})}`);
  }

  if (responseSize !== undefined) {
    details.push(`responseSize: ${responseSize})}`);
  }

  const message = [
    `[${sourceName}] [${type}] ${method}: ${url}`,
    ...(details.length > 0 ? [details.join(' | ')] : []),
  ].join(' | ');

  logger.debug('Request', message);
};

cacheEventStream.subscribe(logCacheEvent);
requestEventStream.subscribe(logRequestEvent);

const publishCacheEvent = (eventData: Omit<CacheEvent, 'timestamp'>): void => {
  const event = createCacheEvent(eventData);
  cacheEventStream.publish(event);
};

const publishRequestStart = (params: PublishRequestStartParams): string => {
  const event = createRequestEvent({
    type: 'START',
    url: params.url,
    method: params.method,
  });
  requestEventStream.publish(event);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const publishRequestSuccess = (params: PublishRequestSuccessParams): void => {
  const event = createRequestEvent({
    type: 'SUCCESS',
    url: params.url,
    method: params.method,
    duration: params.duration,
    status: params.status,
    responseSize: params.responseSize,
  });
  requestEventStream.publish(event);
};

const publishRequestError = (params: PublishRequestErrorParams): void => {
  const event = createRequestEvent({
    type: 'ERROR',
    url: params.url,
    method: params.method,
    duration: params.duration,
    error: params.error,
  });
  requestEventStream.publish(event);
};

const publishRequestTimeout = (params: PublishRequestTimeoutParams): void => {
  const event = createRequestEvent({
    type: 'TIMEOUT',
    url: params.url,
    method: params.method,
    duration: params.duration,
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
