type LogLevel = 'info' | 'warn' | 'error';

const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

const formatMessage = (module: string, message: string): string => {
  return `[next-fetch:${module}] ${message}`;
};

const createLogger = (module: string) => {
  const log = (level: LogLevel, message: string, data?: any): void => {
    if (!isDevelopment()) return;

    const formattedMessage = formatMessage(module, message);

    switch (level) {
      case 'info':
        console.log(formattedMessage, data ? data : '');
        break;
      case 'warn':
        console.warn(formattedMessage, data ? data : '');
        break;
      case 'error':
        console.error(formattedMessage, data ? data : '');
        break;
    }
  };

  return {
    info: (message: string, data?: any) => log('info', message, data),
    warn: (message: string, data?: any) => log('warn', message, data),
    error: (message: string, data?: any) => log('error', message, data),
  };
};

export const clientCacheLogger = createLogger('cache:client');
export const syncLogger = createLogger('cache:sync');
export const optimizerLogger = createLogger('cache:optimizer');
export const requestLogger = createLogger('request');
export const configLogger = createLogger('config');

export const createModuleLogger = createLogger;
