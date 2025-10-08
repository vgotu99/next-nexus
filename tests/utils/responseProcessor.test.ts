import { processResponse } from '@/utils/processResponse';
import { isJsonResponse } from '@/utils/responseProcessor';

const makeResponse = (body: string, headers?: Record<string, string>) =>
  new Response(body, { status: 200, headers });

describe('responseProcessor/processResponse', () => {
  it('isJsonResponse returns true only for application/json', () => {
    const jsonRes = makeResponse('{}', { 'content-type': 'application/json' });
    const textRes = makeResponse('ok', { 'content-type': 'text/plain' });

    expect(isJsonResponse(jsonRes)).toBe(true);
    expect(isJsonResponse(textRes)).toBe(false);
  });

  it('processResponse parses JSON data', async () => {
    const res = makeResponse('{"a":1}', { 'content-type': 'application/json' });

    const out = await processResponse<{ a: number }>(res);
    expect(out.data).toEqual({ a: 1 });
  });

  it('processResponse returns undefined data for non-JSON', async () => {
    const res = makeResponse('ok', { 'content-type': 'text/plain' });

    const out = await processResponse<string>(res);
    expect(out.data).toBeUndefined();
  });

  it('processResponse throws BAD_RESPONSE_ERROR for invalid JSON', async () => {
    const res = makeResponse('not-json', {
      'content-type': 'application/json',
    });

    await expect(processResponse(res)).rejects.toMatchObject({
      name: 'NexusError',
      code: expect.stringContaining('BAD_RESPONSE_ERROR'),
    });
  });
  it('parseJsonResponse parses valid JSON directly', async () => {
    const res = new Response('{"x":2}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const mod = await import('@/utils/responseProcessor');
    await expect(mod.parseJsonResponse<{ x: number }>(res)).resolves.toEqual({
      x: 2,
    });
  });

  it('createNexusResponse wraps Response and preserves data and clone()', async () => {
    const res = new Response('{"y":3}', {
      status: 201,
      statusText: 'Created',
      headers: { 'content-type': 'application/json' },
    });

    const { createNexusResponse } = await import('@/utils/responseProcessor');
    const r1 = createNexusResponse<{ y: number }>(res, { y: 3 });

    expect(r1.status).toBe(201);
    expect(r1.statusText).toBe('Created');
    expect(r1.data).toEqual({ y: 3 });

    const r2 = r1.clone();
    expect(r2.status).toBe(201);
    expect(r2.data).toEqual({ y: 3 });

    await expect(r1.text()).resolves.toBe('{"y":3}');
  });
});
