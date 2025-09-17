'use client';

import { NexusHydrator, NexusRscInitializer } from 'next-nexus/client';

export const NexusRuntime = ({ maxSize }: { maxSize?: number }) => {
  return (
    <>
      <NexusRscInitializer />
      <NexusHydrator maxSize={maxSize} />
    </>
  );
};
