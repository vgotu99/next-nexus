'use client';

import { clientCacheStore } from '@/cache/clientCacheStore';

export const revalidateClientTags = (tags: string[]): void => {
  const keys = clientCacheStore.getKeysByTags(tags);

  keys.forEach(key => {
    clientCacheStore.invalidate(key);
  });
};
