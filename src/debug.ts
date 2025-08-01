import type { DebugConfig, DebugLevel } from '@/types/debug';

const DEFAULT_CONFIG: DebugConfig = {
  enabled: false,
  level: 'info',
  maxBodySize: 1024 * 1024,
};

const createDebugConfig = (): DebugConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const nextFetchDebug = process.env.NEXT_FETCH_DEBUG;

  if (nextFetchDebug) {
    return {
      ...DEFAULT_CONFIG,
      enabled: true,
      level: (nextFetchDebug as DebugLevel) || 'info',
    };
  } else if (isDevelopment) {
    return {
      ...DEFAULT_CONFIG,
      enabled: true,
      level: 'info',
    };
  }

  return DEFAULT_CONFIG;
};

export let debugConfig: DebugConfig = createDebugConfig();

export const setDebugConfig = (config: Partial<DebugConfig>): void => {
  if (process.env.NODE_ENV !== 'development') return;

  debugConfig = { ...debugConfig, ...config };
};

export const getDebugConfig = (): DebugConfig => {
  return { ...debugConfig };
};
