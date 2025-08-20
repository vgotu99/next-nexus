import type { CacheKeyOptions, CacheEntry } from '@/types/cache';
import type { GetNextFetchDefinition } from '@/types/definition';
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

export const generateBaseKey = ({
  url,
  method = 'GET',
}: Omit<CacheKeyOptions, 'clientTags' | 'serverTags'>): string => {
  return `${method.toUpperCase()}:${url}`;
};

export const generateCacheKey = ({
  url,
  method = 'GET',
  clientTags,
  serverTags,
}: CacheKeyOptions): string => {
  const baseKey = generateBaseKey({ url, method });
  const tagsComponent = buildTagsComponent(clientTags, serverTags);

  return [baseKey, tagsComponent].filter(Boolean).join('|');
};

export const generateCacheKeyFromDefinition = (
  definition: GetNextFetchDefinition
): string => {
  const { method, endpoint, client, server, baseURL } = definition;

  const url = baseURL ? `${baseURL}${endpoint}` : endpoint;

  return generateCacheKey({
    url,
    method,
    clientTags: client?.tags,
    serverTags: server?.tags,
  });
};

export const extractBaseKeyFromCacheKey = (cacheKey: string): string => {
  return cacheKey.split('|')[0];
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
  clientRevalidate: number = 0,
  clientTags: string[] = [],
  serverTags: string[] = [],
  etag?: string
): CacheEntry<T> => {
  const now = getCurrentTimestamp();
  const expiresAt =
    clientRevalidate > 0 ? now + clientRevalidate * 1000 : now - 1000;

  return {
    data,
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

export const getTTLFromExpiresAt = (expiresAt: number): number => {
  const now = getCurrentTimestamp();
  const diffMs = expiresAt - now;
  const diffSec = diffMs / 1000;

  return diffSec > 0 ? Number(diffSec.toFixed(1)) : 0;
};
