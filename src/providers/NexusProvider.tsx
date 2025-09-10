import type { ReactNode } from 'react';

import { NexusHydrationBoundary } from '@/server/NexusHydrationBoundary';
import { NexusRscInitializer, NexusHydrator } from 'next-nexus/client';

export interface NexusProviderProps {
  children: ReactNode;
  maxSize?: number;
}

export const NexusProvider = ({ children, maxSize }: NexusProviderProps) => {
  return (
    <>
      <NexusRscInitializer />
      <NexusHydrator maxSize={maxSize} />
      <NexusHydrationBoundary>{children}</NexusHydrationBoundary>
    </>
  );
};
