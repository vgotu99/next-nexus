'use client';

import { clientCache } from '@/cache/clientCache';

export const revalidateClientTags = async (tags: string[]): Promise<void> => {
  await clientCache.revalidateByTags(tags);
};
