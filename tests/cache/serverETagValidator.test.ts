import { isClientETagMatched } from '@/cache/serverETagValidator';
import { generateETag } from '@/utils/cacheUtils';

describe('serverETagValidator', () => {
  it('matches when client etag list includes response data etag', () => {
    const data = { x: 1, y: 'a' };
    const etag = generateETag(data);
    const meta = { ttl: 10, cacheKey: 'k', etag: `${etag},W/"zzz"` };

    expect(isClientETagMatched(data, meta)).toBe(true);
  });

  it('does not match when etag missing or mismatched', () => {
    const data = { p: 2 };
    const meta1 = { ttl: 10, cacheKey: 'k1' };
    const meta2 = { ttl: 10, cacheKey: 'k2', etag: 'W/"aaa"' };

    expect(isClientETagMatched(data, meta1 as any)).toBe(false);
    expect(isClientETagMatched(data, meta2)).toBe(false);
  });
});
