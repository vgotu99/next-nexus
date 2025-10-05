'use client';

import { NexusHydrator } from '@/client/NexusHydrator';
import { NexusRscInitializer } from '@/core/NexusRscInitializer';

export const NexusRuntime = ({ maxSize }: { maxSize?: number }) => {
  return (
    <>
      <NexusRscInitializer />
      <NexusHydrator maxSize={maxSize} />
    </>
  );
};
