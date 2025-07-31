'use client';

import { clientCacheStore } from '@/cache/clientCacheStore';

export const revalidateClientTags = (tags: string[]): void => {
  clientCacheStore.revalidateByTags(tags);
};