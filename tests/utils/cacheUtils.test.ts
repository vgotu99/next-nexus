import {
  generateBaseKey,
  generateCacheKey,
  extractBaseKeyFromCacheKey,
  normalizeCacheTags,
  hasCommonTags,
  createCacheEntry,
  getTTLFromExpiresAt,
} from '@/utils/cacheUtils';

jest.mock('@/utils/timeUtils', () => ({
  getCurrentTimestamp: () => 1_000_000,
  isPast: (t: number) => t < 1_000_000,
}));

describe('cacheUtils', () => {
  it('generateBaseKey builds method:url', () => {
    expect(generateBaseKey({ url: 'http://x', method: 'get' })).toBe(
      'GET:http://x'
    );
  });

  it('generateCacheKey appends sorted tags segment', () => {
    const key = generateCacheKey({
      url: 'u',
      method: 'POST',
      clientTags: ['b', 'a'],
      serverTags: ['c'],
    });
    expect(key).toBe('POST:u|tags:a,b,c');
  });

  it('extractBaseKeyFromCacheKey returns part before |', () => {
    expect(extractBaseKeyFromCacheKey('GET:/v1|tags:a')).toBe('GET:/v1');
  });

  it('normalizeCacheTags trims, dedupes, sorts', () => {
    expect(normalizeCacheTags([' b', 'a ', 'b', ''])).toEqual(['a', 'b']);
  });

  it('hasCommonTags detects intersection', () => {
    expect(hasCommonTags(['a', 'b'], ['c', 'b'])).toBe(true);
    expect(hasCommonTags([], ['c'])).toBe(false);
  });

  it('createCacheEntry sets expiresAt based on clientRevalidate and getTTLFromExpiresAt derives TTL', () => {
    const entry = createCacheEntry({ x: 1 }, 10, ['t1'], ['t2']);
    const ttl = getTTLFromExpiresAt(entry.expiresAt);
    expect(ttl).toBe(10);
  });
});
