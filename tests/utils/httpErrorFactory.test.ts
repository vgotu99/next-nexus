import { ERROR_CODES } from '@/constants/errorCodes';
import { createNetworkError, validateUrl } from '@/utils/httpErrorFactory';

describe('httpErrorFactory', () => {
  it('createNetworkError maps TypeError("Failed to fetch") to NETWORK_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new TypeError('Failed to fetch');

    const nx = createNetworkError(err, req);
    expect(nx.name).toBe('NexusError');
    expect(nx.code).toBe(ERROR_CODES.NETWORK_ERROR);
  });

  it('createNetworkError maps TypeError("NetworkError") to NETWORK_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new TypeError(
      'NetworkError when attempting to fetch resource.'
    );

    const nx = createNetworkError(err, req);
    expect(nx.code).toBe(ERROR_CODES.NETWORK_ERROR);
  });

  it('createNetworkError maps TypeError("CORS") to NETWORK_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new TypeError('CORS blocked');

    const nx = createNetworkError(err, req);
    expect(nx.code).toBe(ERROR_CODES.NETWORK_ERROR);
  });

  it('createNetworkError maps AbortError("timeout") to TIMEOUT_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new DOMException('timeout', 'AbortError');

    const nx = createNetworkError(err, req);
    expect(nx.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
  });

  it('createNetworkError maps AbortError("other") to CANCELED_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new DOMException('aborted', 'AbortError');

    const nx = createNetworkError(err, req);
    expect(nx.code).toBe(ERROR_CODES.CANCELED_ERROR);
  });

  it('createNetworkError maps aborted signal reason "timeout" to TIMEOUT_ERROR', () => {
    const controller = new AbortController();
    controller.abort('timeout');
    const req = new Request('http://localhost/x', {
      signal: controller.signal,
    });

    const nx = createNetworkError(new Error('any'), req);
    expect(nx.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
  });

  it('createNetworkError maps aborted signal to CANCELED_ERROR', () => {
    const controller = new AbortController();
    controller.abort('manual');
    const req = new Request('http://localhost/x', {
      signal: controller.signal,
    });

    const nx = createNetworkError(new Error('any'), req);
    expect(nx.code).toBe(ERROR_CODES.CANCELED_ERROR);
  });

  it('createNetworkError maps SyntaxError("JSON") to BAD_RESPONSE_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new SyntaxError('JSON parse error');

    const nx = createNetworkError(err, req);
    expect(nx.code).toBe(ERROR_CODES.BAD_RESPONSE_ERROR);
  });

  it('createNetworkError defaults to UNKNOWN_ERROR', () => {
    const req = new Request('http://localhost/x');
    const err = new Error('oops');

    const nx = createNetworkError(err, req);
    expect(nx.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
  });

  it('validateUrl throws NexusError with INVALID_URL_ERROR', () => {
    expect(() => validateUrl('http://exa mple.com')).toThrow(
      expect.objectContaining({
        name: 'NexusError',
        code: ERROR_CODES.INVALID_URL_ERROR,
      })
    );
  });

  it('validateUrl passes for valid URL', () => {
    expect(() => validateUrl('http://example.com')).not.toThrow();
  });
});
