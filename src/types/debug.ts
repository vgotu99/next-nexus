export type DebugLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type LogContext = 'Cache' | 'Request' | 'Core' | 'Error' | 'Provider';

export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  filter?: LogContext[];
  maxBodySize?: number;
}
