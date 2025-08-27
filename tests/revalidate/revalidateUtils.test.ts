import { logger } from '@/utils/logger';
import {
  validateNonEmptyStringTags,
  logRevalidation,
  logRevalidationError,
} from '@/utils/revalidateUtils';

jest.mock('@/utils/environmentUtils', () => ({
  isDevelopment: () => true,
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('revalidateUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validateNonEmptyStringTags returns true only when all tags are non-empty strings', () => {
    expect(validateNonEmptyStringTags([])).toBe(false);
    expect(validateNonEmptyStringTags(['a', 'b'])).toBe(true);
    expect(validateNonEmptyStringTags(['a', ' '])).toBe(false);
    expect(validateNonEmptyStringTags(['', 'b'])).toBe(false);
  });

  it('logRevalidation emits info log with server tags', () => {
    logRevalidation(['api', 'cache']);
    expect(logger.info).toHaveBeenCalledTimes(1);
    const msg = (logger.info as jest.Mock).mock.calls[0][0] as string;
    expect(msg).toContain('[api, cache]');
  });

  it('logRevalidationError emits error log with context', () => {
    const err = new Error('boom');
    logRevalidationError(err, ['t1', 't2']);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message, passedError] = (logger.error as jest.Mock).mock.calls[0];
    expect(String(message)).toContain('Revalidation failed');
    expect(String(message)).toContain('server tags: t1, t2');
    expect(passedError).toBe(err);
  });
});
