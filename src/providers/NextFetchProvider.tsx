import type { ReactNode } from 'react';

import ClientNextFetchProvider from '@/providers/ClientNextFetchProvider';
import ServerNextFetchProvider from '@/providers/ServerNextFetchProvider';
import type { NextFetchInstance } from '@/types/instance';
import { isServerEnvironment } from '@/utils';

export interface NextFetchProviderProps {
  children: ReactNode;
  instance?: NextFetchInstance;
}

export const NextFetchProvider = ({
  children,
  instance,
}: NextFetchProviderProps) => {
  return isServerEnvironment() ? (
    <ServerNextFetchProvider>{children}</ServerNextFetchProvider>
  ) : (
    <ClientNextFetchProvider instance={instance}>
      {children}
    </ClientNextFetchProvider>
  );
};
