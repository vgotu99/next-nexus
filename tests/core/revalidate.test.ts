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
  it('revalidateClientTags gets keys by tags and invalidates each', () => {
    const store = require('@/cache/clientCacheStore');
    const getSpy = jest
      .spyOn(store.clientCacheStore, 'getKeysByTags')
      .mockReturnValue(['K1', 'K2']);
    const invalidateSpy = jest
      .spyOn(store.clientCacheStore, 'invalidate')
      .mockImplementation(() => {});

    revalidateClientTags([' a ', 'b', 'a']);

    expect(getSpy).toHaveBeenCalledWith([' a ', 'b', 'a']);
    expect(invalidateSpy).toHaveBeenCalledWith('K1');
    expect(invalidateSpy).toHaveBeenCalledWith('K2');

    getSpy.mockRestore();
    invalidateSpy.mockRestore();
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
