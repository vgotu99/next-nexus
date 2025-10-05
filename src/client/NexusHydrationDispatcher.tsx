'use client';

import type { NexusPayload } from '@/types/payload';
import { isClientEnvironment } from '@/utils/environmentUtils';

export interface NexusHydrationDispatcherProps {
  payload: NexusPayload;
}

export const NexusHydrationDispatcher = ({
  payload,
}: NexusHydrationDispatcherProps) => {
  if (isClientEnvironment()) {
    window.dispatchEvent(new CustomEvent('nexus:hydrate', { detail: payload }));
  }

  return null;
};
