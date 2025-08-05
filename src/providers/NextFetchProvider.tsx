import type { ReactNode } from 'react';

import ClientNextFetchProvider from '@/providers/ClientNextFetchProvider';
import ServerNextFetchProvider from '@/providers/ServerNextFetchProvider';
import { isServerEnvironment } from '@/utils';

export interface NextFetchProviderProps {
  children: ReactNode;
}

export const NextFetchProvider = ({ children }: NextFetchProviderProps) => {
  return isServerEnvironment() ? (
    <ServerNextFetchProvider>{children}</ServerNextFetchProvider>
  ) : (
    <ClientNextFetchProvider>{children}</ClientNextFetchProvider>
  );
};
