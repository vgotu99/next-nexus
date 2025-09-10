'use client';

import type { NexusPayload } from '@/types/payload';

export interface NexusHydrationDispatcherProps {
  payload: NexusPayload;
}

export const NexusHydrationDispatcher = ({
  payload,
}: NexusHydrationDispatcherProps) => {
  window.dispatchEvent(new CustomEvent('nexus:hydrate', { detail: payload }));

  return null;
};
