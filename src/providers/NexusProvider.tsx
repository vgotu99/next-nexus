import type { ReactNode } from 'react';

import ClientNexusProvider from '@/providers/ClientNexusProvider';
import ServerNexusProvider from '@/providers/ServerNexusProvider';
import { isServerEnvironment } from '@/utils/environmentUtils';

export interface NexusProviderProps {
  children: ReactNode;
  maxSize?: number;
}

export const NexusProvider = ({ children, maxSize }: NexusProviderProps) => {
  return isServerEnvironment() ? (
    <ServerNexusProvider>{children}</ServerNexusProvider>
  ) : (
    <ClientNexusProvider maxSize={maxSize}>{children}</ClientNexusProvider>
  );
};
