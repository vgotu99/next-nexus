import type { HydrationData } from './cache';

export interface NextFetchPayload {
  readonly hydrationData: HydrationData;
  readonly notModifiedKeys: readonly string[];
}
