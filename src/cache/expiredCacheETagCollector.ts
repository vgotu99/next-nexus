import { clientCacheStore } from '@/cache/clientCacheStore';
import { isCacheEntryExpired } from '@/utils/cacheUtils';
import { isClientEnvironment } from '@/utils/environmentUtils';

export interface ExpiredCacheETagEntry {
  cacheKey: string;
  etag: string;
  originalTTL?: number;
}

const MAX_ETAG_HEADER_SIZE = 4096;

export const collectExpiredCacheETags = async (): Promise<
  ExpiredCacheETagEntry[]
> => {
  if (!isClientEnvironment()) {
    return [];
  }

  const cacheKeys = await clientCacheStore.keys();

  const etagPromises = cacheKeys.map(async key => {
    const entry = await clientCacheStore.get<unknown>(key);

    if (!entry) {
      return null;
    }

    if (isCacheEntryExpired(entry) && entry.etag) {
      return {
        cacheKey: entry.key,
        etag: entry.etag,
        originalTTL: entry.clientRevalidate,
      } as ExpiredCacheETagEntry;
    }

    return null;
  });

  const resolvedETags = await Promise.all(etagPromises);

  return resolvedETags.filter(
    (entry): entry is ExpiredCacheETagEntry => entry !== null
  );
};

export const serializeETagsForHeader = (etags: string[]): string => {
  if (etags.length === 0) {
    return '';
  }

  const { header: finalHeader, truncated } = etags.reduce(
    (acc, etag) => {
      if (acc.truncated) {
        return acc;
      }
      const separator = acc.header ? ', ' : '';
      const newHeader = `${acc.header}${separator}${etag}`;
      if (newHeader.length > MAX_ETAG_HEADER_SIZE) {
        return { ...acc, truncated: true };
      }
      return { header: newHeader, truncated: false };
    },
    { header: '', truncated: false }
  );

  if (truncated) {
    const fullHeaderLength = etags.join(', ').length;
    console.warn(
      `ETag header exceeds size limit (${fullHeaderLength} > ${MAX_ETAG_HEADER_SIZE}). Truncating...`
    );
  }

  return finalHeader;
};

export const createIfNoneMatchHeader = async (): Promise<string | null> => {
  try {
    const expiredETags = await collectExpiredCacheETags();

    if (expiredETags.length === 0) {
      return null;
    }

    const etagValues = expiredETags.map(entry => entry.etag);
    const headerValue = serializeETagsForHeader(etagValues);

    return headerValue || null;
  } catch (error) {
    console.warn('[next-fetch] Failed to create If-None-Match header:', error);
    return null;
  }
};

export const getExpiredETagByCacheKey = async (
  cacheKey: string
): Promise<string | null> => {
  if (!isClientEnvironment()) {
    return null;
  }

  try {
    const entry = await clientCacheStore.get(cacheKey);

    if (!entry || !entry.etag) {
      return null;
    }

    return isCacheEntryExpired(entry) ? entry.etag : null;
  } catch (error) {
    console.warn(
      `[next-fetch] Failed to get expired ETag for key ${cacheKey}:`,
      error
    );
    return null;
  }
};

export const getExpiredCacheKeyToETagMap = async (): Promise<
  Map<string, string>
> => {
  try {
    const expiredETags = await collectExpiredCacheETags();
    const etagMap = new Map<string, string>();

    expiredETags.forEach(({ cacheKey, etag }) => {
      etagMap.set(cacheKey, etag);
    });

    return etagMap;
  } catch (error) {
    console.warn('[next-fetch] Failed to create cache key to ETag map:', error);
    return new Map();
  }
};
