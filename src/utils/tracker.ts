import type { CacheEvent, RequestEvent } from '@/types/debug';
import {
  createEventStream,
  createCacheEvent,
  createRequestEvent,
} from '@/utils/eventStream';
import { logger } from '@/utils/logger';

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

const cacheEventStream = createEventStream<CacheEvent>();
const requestEventStream = createEventStream<RequestEvent>();

const formatClientCacheDetails = (event: CacheEvent): string[] => {
  const details: string[] = [];
  if (event.clientTags?.length) {
    details.push(`- Tags: [${event.clientTags.join(', ')}]`);
  }
  if (event.clientTTL !== undefined) {
    details.push(`- TTL: ${event.clientTTL}s remaining`);
  }
  if (event.size !== undefined && event.maxSize !== undefined) {
    details.push(`- Size: ${event.size}/${event.maxSize}`);
  }
  return details;
};

const formatServerCacheDetails = (event: CacheEvent): string[] => {
  const details: string[] = [];
  if (event.serverTTL !== undefined) {
    details.push(`- TTL: ${event.serverTTL}s remaining`);
  }
  if (event.serverTags?.length) {
    details.push(`- Req. Tags: [${event.serverTags.join(', ')}]`);
  }
  return details;
};

const logCacheEvent = (event: CacheEvent): void => {
  const { type, key, source } = event;
  const icon = source === 'client' ? (type === 'HIT' ? '🔵' : '⚪️') : '⚫️';
  const sourceName = source === 'client' ? 'CLIENT' : 'SERVER';

  const baseMessage = `${icon} [${sourceName} CACHE | ${type}] ${key}`;
  const details =
    source === 'client'
      ? formatClientCacheDetails(event)
      : formatServerCacheDetails(event);

  const message =
    details.length > 0 ? `${baseMessage}\n${details.join('\n')}` : baseMessage;

  logger.debug('Cache', message);
};

const logRequestEvent = (event: RequestEvent): void => {
  const message = `Request ${event.type}: ${event.method} ${event.url}`;
  const data = {
    duration: event.duration,
    status: event.status,
    error: event.error,
    requestSize: event.requestSize,
    responseSize: event.responseSize,
  };
  logger.debug('Request', message, data);
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

export const trackCache = publishCacheEvent;
export const trackRequestStart = publishRequestStart;
export const trackRequestSuccess = publishRequestSuccess;
export const trackRequestError = publishRequestError;

export const subscribeToCacheEvents = cacheEventStream.subscribe;
export const subscribeToRequestEvents = requestEventStream.subscribe;
