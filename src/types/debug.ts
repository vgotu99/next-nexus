import { CacheRevalidateTime } from '@/types/cache';

export type DebugLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogContext = 'Cache' | 'Request' | 'Core' | 'Error' | 'Provider';

export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  filter?: LogContext[];
  maxBodySize?: number;
}

export type CacheEventType =
  | 'HIT'
  | 'MISS'
  | 'SKIP'
  | 'MATCH'
  | 'SET'
  | 'UPDATE'
  | 'DELETE'
  | 'CLEAR';

export type CacheSource =
  | 'client-fetch'
  | 'client-manual'
  | 'client-hydration'
  | 'server';

export type RequestEventType = 'START' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: number;
  source: CacheSource;
  duration?: number;
  status?: number;
  tags?: string[];
  revalidate?: CacheRevalidateTime;
  ttl?: number;
  size?: number;
  maxSize?: number;
}

export interface RequestEvent {
  type: RequestEventType;
  url: string;
  method: string;
  timestamp: number;
  duration?: number;
  status?: number;
  error?: string;
  requestSize?: number;
  responseSize?: number;
}

export type Unsubscribe = () => void;

export interface EventStream<T> {
  subscribe: (handler: (event: T) => void) => Unsubscribe;
  publish: (event: T) => void;
  clear: () => void;
}
