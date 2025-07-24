'use client';

import { clientCache } from '@/cache/clientCache';
import { internalNextRevalidateServerTags as serverRevalidateTags } from '@/revalidate/revalidateServer';
import type { RevalidateTagsInput } from '@/types/revalidate';
import {
  logRevalidationError,
  normalizeRevalidateInput,
  validateRevalidateInput,
} from '@/utils/revalidateUtils';

const nextRevalidateClientTags = async (
  tags: RevalidateTagsInput
): Promise<void> => {
  try {
    if (!validateRevalidateInput(tags)) {
      throw new Error(
        'Invalid revalidation input: tags must be non-empty strings'
      );
    }

    const { serverTags, clientTags } = normalizeRevalidateInput(tags);

    if (serverTags.length === 0 && clientTags.length > 0) {
      await clientCache.invalidateByTags(clientTags);

      return;
    }

    if (serverTags.length > 0 && clientTags.length === 0) {
      await serverRevalidateTags(serverTags);

      return;
    }

    const serverRevalidatedClientTags = await serverRevalidateTags(serverTags);

    await clientCache.invalidateByTags(serverRevalidatedClientTags);
  } catch (error) {
    logRevalidationError(
      error,
      Array.isArray(tags) ? tags : [...(tags.client || [])],
      'client'
    );
  }
};

export { nextRevalidateClientTags as nextRevalidateTags };
