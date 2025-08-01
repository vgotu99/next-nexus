import { MAX_CACHE_KEY_LENGTH } from '@/constants';
import type { CacheKeyOptions, CacheEntry } from '@/types';
import { getCurrentTimestamp, isPast } from '@/utils/timeUtils';

const buildTagsComponent = (
  clientTags?: string[],
  serverTags?: string[]
): string | null => {
  const allTags = [...(clientTags || []), ...(serverTags || [])];
  if (allTags.length === 0) return null;

  const sortedTags = [...allTags].sort().join(',');
  return `tags:${sortedTags}`;
};

export const generateCacheKey = ({
  endpoint,
  method = 'GET',
  clientTags,
  serverTags,
}: CacheKeyOptions): string => {
  const baseKey = `${method.toUpperCase()}:${endpoint}`;
  const tagsComponent = buildTagsComponent(clientTags, serverTags);

  return [baseKey, tagsComponent].filter(Boolean).join('|');
};

export const isCacheEntryExpired = (entry: CacheEntry): boolean =>
  isPast(entry.expiresAt);

export const normalizeCacheTags = (tags?: string[]): string[] => {
  if (!tags?.length) return [];

  const processedTags = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  return [...new Set(processedTags)].sort();
};

export const hasCommonTags = (tagsA: string[], tagsB: string[]): boolean => {
  if (!tagsA.length || !tagsB.length) return false;

  const tagsSet = new Set(tagsA);
  return tagsB.some(tag => tagsSet.has(tag));
};

export const createCacheEntry = <T>(
  data: T,
  key: string,
  clientRevalidate: number = 0,
  clientTags: string[] = [],
  serverTags: string[] = [],
  etag?: string
): CacheEntry<T> => {
  const now = getCurrentTimestamp();
  const expiresAt =
    clientRevalidate > 0 ? now + clientRevalidate * 1000 : now - 1000; // TTL이 0이면 1초 전으로 설정하여 즉시 만료

  return {
    data,
    key,
    createdAt: now,
    expiresAt,
    clientRevalidate,
    clientTags: normalizeCacheTags(clientTags),
    serverTags: normalizeCacheTags(serverTags),
    etag,
  };
};

export const generateETag = (data: unknown): string => {
  const jsonString = JSON.stringify(data);

  const hash = jsonString.split('').reduce((acc, char) => {
    const newHash = (acc << 5) - acc + char.charCodeAt(0);
    return newHash & newHash;
  }, 0);

  return `W/"${Math.abs(hash).toString(36)}"`;
};

export const isValidCacheKey = (key: string): boolean => {
  if (typeof key !== 'string' || !key) return false;
  return key.length <= MAX_CACHE_KEY_LENGTH && !key.includes('\n');
};
