import type { ExtendTTLData, HydrationData } from './cache';

declare global {
  interface Window {
    __NEXT_FETCH_HYDRATION__?: HydrationData;
    __NEXT_FETCH_EXTEND_TTL__?: ExtendTTLData;
  }
}

export {};
