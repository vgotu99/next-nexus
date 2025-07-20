import type {
  CacheKeyOptions,
  CacheEntry,
  CacheUtils,
  CacheRevalidateTime,
} from '@/types';
import { getCurrentTimestamp, isPast } from '@/utils/timeUtils';

export const generateCacheKey = ({
  endpoint,
  method = 'GET',
  params,
  clientTags,
  serverTags,
}: CacheKeyOptions): string => {
  const baseKey = `${method.toUpperCase()}:${endpoint}`;

  const paramComponent =
    params && Object.keys(params).length > 0
      ? `params:${Object.keys(params)
          .sort()
          .map(key => `${key}=${encodeURIComponent(String(params[key]))}`)
          .join('&')}`
      : null;

  const allTags = [...(clientTags || []), ...(serverTags || [])];
  const tagsComponent =
    allTags.length > 0 ? `tags:${[...allTags].sort().join(',')}` : null;

  return [baseKey, paramComponent, tagsComponent].filter(Boolean).join('|');
};

export const isCacheEntryExpired = (entry: CacheEntry): boolean =>
  isPast(entry.expiresAt);

export const calculateCacheTTL = (revalidate?: CacheRevalidateTime): number => {
  if (
    revalidate === false ||
    (typeof revalidate === 'number' && revalidate < 0)
  ) {
    return Infinity;
  }

  if (typeof revalidate === 'number' && revalidate > 0) {
    return revalidate * 1000;
  }

  return 5 * 60 * 1000;
};

export const normalizeCacheTags = (tags?: string[]): string[] => {
  if (!tags?.length) {
    return [];
  }

  const processedTags = tags
    .filter(tag => typeof tag === 'string' && tag.trim())
    .map(tag => tag.trim().toLowerCase());

  return [...new Set(processedTags)].sort();
};

export const createCacheEntry = <T>(
  data: T,
  key: string,
  ttl: number,
  clientTags: string[] = [],
  serverTags: string[] = [],
  etag?: string
): CacheEntry<T> => {
  const now = getCurrentTimestamp();
  const expiresAt = ttl === Infinity ? Infinity : now + ttl;

  return {
    data,
    key,
    createdAt: now,
    expiresAt,
    clientTags: normalizeCacheTags(clientTags),
    serverTags: normalizeCacheTags(serverTags),
    etag,
  };
};

export const hasCommonTags = (tagsA: string[], tagsB: string[]): boolean => {
  if (!tagsA.length || !tagsB.length) {
    return false;
  }
  const tagsSet = new Set(tagsA);
  return tagsB.some(tag => tagsSet.has(tag));
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
  if (typeof key !== 'string' || !key) {
    return false;
  }
  return key.length <= 1000 && !key.includes('\n');
};

export const cacheUtils: CacheUtils = {
  generateCacheKey,
  isCacheEntryExpired,
  calculateCacheTTL,
  normalizeCacheTags,
};
