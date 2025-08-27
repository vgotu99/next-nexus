import { revalidateClientTags } from '@/revalidate/revalidateClientTags';
import { revalidateServerTags } from '@/revalidate/revalidateServerTags';

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/revalidateUtils', () => {
  const original = jest.requireActual('@/utils/revalidateUtils');
  return {
    ...original,
    logRevalidation: jest.fn(),
    logRevalidationError: jest.fn(),
  };
});

describe('revalidate utilities', () => {
  it('revalidateClientTags delegates to clientCacheStore.revalidateByTags', () => {
    const store = require('@/cache/clientCacheStore');
    const spy = jest.spyOn(store.clientCacheStore, 'revalidateByTags');

    revalidateClientTags([' a ', 'b', 'a']);
    expect(spy).toHaveBeenCalledWith([' a ', 'b', 'a']);
  });

  it('revalidateServerTags normalizes, validates, logs, and calls next/cache', async () => {
    const { revalidateTag } = require('next/cache');
    const utils = require('@/utils/revalidateUtils');

    await revalidateServerTags([' a ', 'b', 'a']);

    expect(utils.logRevalidation).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it('revalidateServerTags throws and logs on invalid input', async () => {
    jest.doMock('@/utils/revalidateUtils', () => ({
      validateNonEmptyStringTags: () => false,
      logRevalidation: jest.fn(),
      logRevalidationError: jest.fn(),
    }));

    const {
      revalidateServerTags: invalidRevalidate,
    } = require('@/revalidate/revalidateServerTags');

    await expect(invalidRevalidate(['', '  '])).rejects.toBeInstanceOf(Error);
  });
});
