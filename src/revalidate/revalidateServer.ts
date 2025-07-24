'use server';

import { revalidateTag } from 'next/cache';

import type { RevalidateTagsInput } from '@/types/revalidate';
import {
  logRevalidation,
  logRevalidationError,
  normalizeRevalidateInput,
  validateRevalidateInput,
} from '@/utils/revalidateUtils';

export const internalNextRevalidateServerTags = async (
  tags: RevalidateTagsInput
): Promise<string[]> => {
  try {
    if (!validateRevalidateInput(tags)) {
      throw new Error(
        'Invalid revalidation input: tags must be non-empty strings'
      );
    }

    const { serverTags, clientTags } = normalizeRevalidateInput(tags);

    logRevalidation(serverTags, clientTags);

    if (serverTags.length > 0) {
      await Promise.all(serverTags.map(tag => revalidateTag(tag)));
    }

    return clientTags;
  } catch (error) {
    logRevalidationError(
      error,
      Array.isArray(tags) ? tags : [...(tags.server || [])],
      'server'
    );
    throw error;
  }
};

const nextRevalidateServerTags = async (
  tags: RevalidateTagsInput
): Promise<void> => {
  await internalNextRevalidateServerTags(tags);
};

export { nextRevalidateServerTags as nextRevalidateTags };
