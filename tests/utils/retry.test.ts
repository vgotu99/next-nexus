import { ERROR_CODES } from '@/constants/errorCodes';
import { createNexusError } from '@/errors/errorFactory';
import { retry } from '@/utils/retry';

const makeTimeoutError = () =>
  createNexusError('Request timeout', {
    request: new Request('http://localhost/timeout'),
    code: ERROR_CODES.TIMEOUT_ERROR,
  });

const makeServerError = () =>
  createNexusError('Server error', {
    request: new Request('http://localhost/server-error'),
    code: ERROR_CODES.SERVER_ERROR,
  });

describe('retry', () => {
  it('retries on TIMEOUT_ERROR and eventually succeeds', async () => {
    let attempts = 0;

    const result = await retry({
      attempt: async () => {
        attempts += 1;
        if (attempts < 3) throw makeTimeoutError();
        return 'ok';
      },
      maxAttempts: 5,
      delaySeconds: 0,
      timeoutSeconds: 1,
      context: { url: 'http://localhost/api', method: 'GET' },
    });

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('retries on non-NexusError up to maxAttempts then throws', async () => {
    let attempts = 0;

    await expect(
      retry({
        attempt: async () => {
          attempts += 1;
          throw new Error('network flake');
        },
        maxAttempts: 2,
        delaySeconds: 0,
        timeoutSeconds: 1,
        context: { url: 'http://localhost/api', method: 'GET' },
      })
    ).rejects.toThrow('network flake');

    expect(attempts).toBe(2);
  });

  it('retries on SERVER_ERROR and eventually throws when exhausted', async () => {
    let attempts = 0;

    await expect(
      retry({
        attempt: async () => {
          attempts += 1;
          throw makeServerError();
        },
        maxAttempts: 3,
        delaySeconds: 0,
        timeoutSeconds: 1,
        context: { url: 'http://localhost/api', method: 'GET' },
      })
    ).rejects.toMatchObject({ name: 'NexusError', code: ERROR_CODES.SERVER_ERROR });

    expect(attempts).toBe(3);
  });
});

