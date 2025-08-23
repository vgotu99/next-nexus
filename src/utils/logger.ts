import { ERROR_MESSAGE_PREFIX } from '@/constants/errorMessages';
import { getDebugConfig } from '@/debug/config';
import { isDevelopment } from '@/utils/environmentUtils';

const isDebugEnabled = (): boolean => getDebugConfig().enabled;

const sink = {
  debug: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
} as const;

const format = (message: string): string =>
  `${ERROR_MESSAGE_PREFIX} ${message}`;

const log =
  (level: 'debug' | 'info' | 'warn' | 'error') =>
  (message: string, meta?: unknown): void => {
    if (!isDevelopment()) return;
    if (level === 'debug' && !isDebugEnabled()) return;

    const msg = format(message);
    if (meta !== undefined) {
      sink[level](msg, meta);
    } else {
      sink[level](msg);
    }
  };

export const logger = {
  debug: log('debug'),
  info: log('info'),
  warn: log('warn'),
  error: log('error'),
};
