import type { ReactNode } from 'react';

import ClientNextFetchProvider from '@/providers/ClientNextFetchProvider';
import ServerNextFetchProvider from '@/providers/ServerNextFetchProvider';
import { isServerEnvironment } from '@/utils';

export interface NextFetchProviderProps {
  children: ReactNode;
  maxSize?: number;
}

export const NextFetchProvider = ({
  children,
  maxSize,
}: NextFetchProviderProps) => {
  return isServerEnvironment() ? (
    <ServerNextFetchProvider>{children}</ServerNextFetchProvider>
  ) : (
    <ClientNextFetchProvider maxSize={maxSize}>
      {children}
    </ClientNextFetchProvider>
  );
};
