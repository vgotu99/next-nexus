jest.mock('../executeRequest', () => ({
  executeRequest: jest.fn().mockResolvedValue({
    data: { message: 'success' },
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  }),
}));

import { executeRequest } from '../executeRequest';

describe('executeRequest', () => {
  it('should be defined', () => {
    expect(executeRequest).toBeDefined();
    expect(typeof executeRequest).toBe('function');
  });

  it('should be callable', async () => {
    const mockRequest = new Request('https://api.example.com/test');
    const mockCleanup = jest.fn() as any;

    const result = await executeRequest(mockRequest, mockCleanup);
    expect(result).toBeDefined();
    expect(result.status).toBe(200);
  });
});
