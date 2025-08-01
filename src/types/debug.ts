export type DebugLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type LogContext = 'Cache' | 'Request' | 'Core' | 'Error' | 'Provider';

export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  filter?: LogContext[];
  maxBodySize?: number;
}

export type CacheEventType = 'HIT' | 'MISS';
export type RequestEventType = 'START' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: number;
  source: 'client' | 'server';
  clientTags?: string[];
  serverTags?: string[];
  clientTTL?: number;
  serverTTL?: number;
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
