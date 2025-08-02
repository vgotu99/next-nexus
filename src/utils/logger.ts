import { ERROR_MESSAGE_PREFIX } from '@/constants/errorMessages';
import { getDebugConfig } from '@/debug/config';
import type { DebugLevel, LogContext } from '@/types/debug';

const LOG_LEVELS: Record<DebugLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const shouldLog = (level: DebugLevel, context?: LogContext): boolean => {
  const config = getDebugConfig();
  if (!config.enabled) return false;

  if (LOG_LEVELS[level] > LOG_LEVELS[config.level]) return false;

  if (config.filter && context && !config.filter.includes(context))
    return false;

  return true;
};

const formatLog = (
  level: DebugLevel,
  context: LogContext,
  message: string,
  data?: unknown
): string => {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  const contextTag = `[${context}]`;

  const formattedMessage = `${ERROR_MESSAGE_PREFIX} ${timestamp} ${levelUpper} ${contextTag} ${message}`;

  if (data !== undefined) {
    const dataStr =
      typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    return `${formattedMessage}\n${dataStr}`;
  }

  return formattedMessage;
};

const summarizeLargeData = (
  data: unknown,
  maxSize: number = getDebugConfig().maxBodySize || 1024 * 1024
): unknown => {
  if (typeof data === 'string' && data.length > maxSize) {
    return {
      size: `${(data.length / 1024 / 1024).toFixed(1)}MB`,
      type: 'string',
      preview: data.substring(0, 100) + '...',
    };
  }

  if (data instanceof ArrayBuffer && data.byteLength > maxSize) {
    return {
      size: `${(data.byteLength / 1024 / 1024).toFixed(1)}MB`,
      type: 'ArrayBuffer',
    };
  }

  return data;
};

const prepareLogMessage = (
  level: DebugLevel,
  context: LogContext,
  message: string,
  data?: unknown
) => {
  const logData = data ? summarizeLargeData(data) : undefined;
  const formattedMessage = formatLog(level, context, message, logData);

  return formattedMessage;
};

export const logError = (
  context: LogContext,
  message: string,
  error?: unknown
): void => {
  if (!shouldLog('error', context)) return;

  const formattedMessage = prepareLogMessage('error', context, message, error);
  console.error(formattedMessage);
};

export const logWarn = (
  context: LogContext,
  message: string,
  data?: unknown
): void => {
  if (!shouldLog('warn', context)) return;

  const formattedMessage = prepareLogMessage('warn', context, message, data);
  console.warn(formattedMessage);
};

export const logInfo = (
  context: LogContext,
  message: string,
  data?: unknown
): void => {
  if (!shouldLog('info', context)) return;

  const formattedMessage = prepareLogMessage('info', context, message, data);
  console.info(formattedMessage);
};

export const logDebug = (
  context: LogContext,
  message: string,
  data?: unknown
): void => {
  if (!shouldLog('debug', context)) return;

  const formattedMessage = prepareLogMessage('debug', context, message, data);
  console.log(formattedMessage);
};

export const logger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
};
