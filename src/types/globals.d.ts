import type { NexusPayload } from './payload';

declare global {
  interface Window {
    __NEXUS_PAYLOAD__?: NexusPayload;
  }
}

export {};
