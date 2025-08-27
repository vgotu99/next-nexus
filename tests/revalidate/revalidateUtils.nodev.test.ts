import { logger } from '@/utils/logger';

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('revalidateUtils in non-development', () => {
  it('logRevalidation is a no-op when not in development', async () => {
    await new Promise<void>(resolve => {
      jest.isolateModules(() => {
        jest.doMock('@/utils/environmentUtils', () => ({
          isDevelopment: () => false,
        }));
        const { logRevalidation } = require('@/utils/revalidateUtils');
        logRevalidation(['x']);
        expect(logger.info).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
});
