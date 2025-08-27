import { http, HttpResponse } from 'msw';

import { ERROR_CODES } from '@/constants/errorCodes';
import { executeRequest } from '@/utils/executeRequest';

import { server } from '../setup';

describe('executeRequest - http error', () => {
  it('throws NexusError with mapped code for 404', async () => {
    server.use(
      http.get('http://localhost/api/error', () =>
        HttpResponse.json({ message: 'Resource not found' }, { status: 404 })
      )
    );

    const req = new Request('http://localhost/api/error');

    await expect(executeRequest(req)).rejects.toMatchObject({
      name: 'NexusError',
      message: 'Resource not found',
      code: ERROR_CODES.NOT_FOUND_ERROR,
      response: expect.objectContaining({ status: 404 }),
    });
  });
});
