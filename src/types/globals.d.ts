import type { NextFetchPayload } from './payload';

declare global {
  interface Window {
    __NEXT_FETCH_PAYLOAD__?: NextFetchPayload;
  }
}

export {};
