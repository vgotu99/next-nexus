import type { ClientRevalidateResult } from '@/types';
import { syncManager } from './SyncManager';

export const revalidateClientTag = async (
  tags: string | string[]
): Promise<ClientRevalidateResult> => {
  const tagArray = Array.isArray(tags) ? tags : [tags];

  const result: ClientRevalidateResult = {
    success: true,
    invalidatedCount: 0,
    tags: tagArray,
    errors: [],
  };

  if (typeof window === 'undefined') {
    result.success = false;
    result.errors?.push(
      'revalidateClientTag can only be used in client components'
    );

    return result;
  }

  try {
    result.invalidatedCount = await syncManager.invalidateByTags(tagArray);
  } catch (error) {
    result.success = false;
    result.errors?.push(error instanceof Error ? error.message : String(error));

    console.error('[next-fetch] Failed to invalidate client cache:', error);
  }

  return result;
};
