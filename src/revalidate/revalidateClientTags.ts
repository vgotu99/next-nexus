'use client';

import { clientCacheStore } from '@/cache/clientCacheStore';

export const revalidateClientTags = async (tags: string[]): Promise<void> => {
  await clientCacheStore.revalidateByTags(tags);
};
