import type { HydrationData } from './cache';

declare global {
  interface Window {
    __NEXT_FETCH_HYDRATION__?: HydrationData;
  }
}

export {};
