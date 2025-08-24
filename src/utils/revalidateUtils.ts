import { isDevelopment } from '@/utils/environmentUtils';
import { logger } from '@/utils/logger';

export const validateNonEmptyStringTags = (tags: string[]): boolean => {
  if (tags.length === 0) return false;

  return tags.every(tag => typeof tag === 'string' && tag.trim() !== '');
};

export const logRevalidation = (serverTags: string[]): void => {
  if (!isDevelopment()) return;

  const serverInfo = serverTags.length > 0 ? serverTags.join(', ') : 'none';

  logger.info(`[Cache] Revalidating server cache - Server: [${serverInfo}]`);
};

export const logRevalidationError = (error: unknown, tags?: string[]): void => {
  const tagInfo = tags?.length ? ` (server tags: ${tags.join(', ')})` : '';
  logger.error(`[Cache] Revalidation failed${tagInfo}`, error);
};
