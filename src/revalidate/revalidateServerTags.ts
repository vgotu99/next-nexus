'use server';

import { revalidateTag } from 'next/cache';

import { normalizeCacheTags } from '@/utils/cacheUtils';
import {
  logRevalidation,
  logRevalidationError,
  validateNonEmptyStringTags,
} from '@/utils/revalidateUtils';

export const revalidateServerTags = async (tags: string[]): Promise<void> => {
  try {
    const normalizedTags = normalizeCacheTags(tags);

    if (!validateNonEmptyStringTags(normalizedTags)) {
      throw new Error(
        'Invalid revalidation input: tags must be non-empty strings'
      );
    }

    logRevalidation(normalizedTags);

    await Promise.all(normalizedTags.map(tag => revalidateTag(tag)));
  } catch (error) {
    logRevalidationError(error, tags);
    throw error;
  }
};
