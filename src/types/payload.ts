import type { HydrationData } from './cache';

export interface NexusPayload {
  readonly hydrationData: HydrationData;
  readonly notModifiedKeys: readonly string[];
  readonly pathname: string;
}
