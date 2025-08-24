import { ERROR_CODES } from '@/constants/errorCodes';
import { isNextFetchError } from '@/errors/errorFactory';
import { logger } from '@/utils/logger';

import { setupTimeout } from './setupTimeout';
import { secondsToMs } from './timeUtils';

interface RetryConfig<T> {
  attempt: (config: { signal: AbortSignal }) => Promise<T>;
  maxAttempts: number;
  delaySeconds: number;
  timeoutSeconds: number;
}

const shouldRetry = (error: unknown): boolean => {
  if (!isNextFetchError(error)) return true;

  const { code } = error;

  return (
    code === ERROR_CODES.TIMEOUT_ERROR ||
    code === ERROR_CODES.SERVER_ERROR ||
    code === ERROR_CODES.RATE_LIMITED_ERROR
  );
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const retry = async <T>({
  attempt,
  maxAttempts,
  delaySeconds,
  timeoutSeconds,
}: RetryConfig<T>): Promise<T> => {
  const attemptWithRetry = async (attemptIndex: number): Promise<T> => {
    const abortController = new AbortController();
    const timeoutId = setupTimeout(
      abortController,
      secondsToMs(timeoutSeconds)
    );

    try {
      const result = await attempt({ signal: abortController.signal });
      clearTimeout(timeoutId);

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (attemptIndex >= maxAttempts - 1 || !shouldRetry(error)) {
        throw error;
      }

      logger.warn(
        `[Request] Request failed. Retrying (${attemptIndex + 1}/${maxAttempts - 1})...`
      );

      await sleep(secondsToMs(delaySeconds));

      return attemptWithRetry(attemptIndex + 1);
    }
  };

  return attemptWithRetry(0);
};
