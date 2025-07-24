import type {
  RevalidateTagsInput,
  NormalizedRevalidateTags,
} from '@/types/revalidate';
import { normalizeCacheTags } from '@/utils/cacheUtils';
import { isDevelopment } from '@/utils/environmentUtils';

export const normalizeRevalidateInput = (
  input: RevalidateTagsInput
): NormalizedRevalidateTags => {
  if (Array.isArray(input)) {
    const normalizedTags = normalizeCacheTags(input);
    return {
      serverTags: normalizedTags,
      clientTags: normalizedTags,
    };
  }

  return {
    serverTags: normalizeCacheTags(input.server || []),
    clientTags: normalizeCacheTags(input.client || []),
  };
};

const validateNonEmptyStringTags = (tags: string[]): boolean => {
  if (tags.length === 0) return false;

  return tags.every(tag => typeof tag === 'string' && tag.trim() !== '');
};

export const validateRevalidateInput = (
  input: RevalidateTagsInput
): boolean => {
  const { serverTags, clientTags } = normalizeRevalidateInput(input);

  return validateNonEmptyStringTags(serverTags) || validateNonEmptyStringTags(clientTags);
};

export const logRevalidation = (
  serverTags: string[],
  clientTags: string[]
): void => {
  if (!isDevelopment()) return;

  const serverInfo = serverTags.length > 0 ? serverTags.join(', ') : 'none';
  const clientInfo = clientTags.length > 0 ? clientTags.join(', ') : 'none';

  console.log(
    `[next-fetch] Revalidating cache - Server: [${serverInfo}], Client: [${clientInfo}]`
  );
};

export const logRevalidationError = (
  error: unknown,
  tags?: string[],
  type?: 'server' | 'client'
): void => {
  const tagInfo = tags?.length ? ` (${type} tags: ${tags.join(', ')})` : '';
  console.error(`[next-fetch] Revalidation failed${tagInfo}:`, error);
};
