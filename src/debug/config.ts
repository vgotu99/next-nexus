import type { DebugConfig } from '@/types/debug';
import { isDevelopment } from '@/utils/environmentUtils';

const debugConfig: DebugConfig = {
  enabled:
    isDevelopment() && process.env.NEXT_PUBLIC_NEXUS_DEBUG === 'true',
  level: 'debug',
};

export const getDebugConfig = (): DebugConfig => {
  return debugConfig;
};
