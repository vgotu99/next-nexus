import { setupHeaders } from '@/utils';

describe('setupHeaders', () => {
  it('should create empty headers when no arguments provided', () => {
    const headers = setupHeaders();

    expect(headers).toBeInstanceOf(Headers);
    expect(Array.from(headers.keys())).toHaveLength(0);
  });

  it('should create headers from default headers only', () => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
    };

    const headers = setupHeaders(defaultHeaders);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token123');
  });

  it('should create headers from config headers only', () => {
    const configHeaders = {
      'X-API-Key': 'key123',
      Accept: 'application/json',
    };

    const headers = setupHeaders({}, configHeaders);

    expect(headers.get('X-API-Key')).toBe('key123');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('should merge default and config headers', () => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
    };

    const configHeaders = {
      'X-API-Key': 'key123',
      Accept: 'application/xml',
    };

    const headers = setupHeaders(defaultHeaders, configHeaders);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token123');
    expect(headers.get('X-API-Key')).toBe('key123');
    expect(headers.get('Accept')).toBe('application/xml');
  });

  it('should override default headers with config headers', () => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
    };

    const configHeaders = {
      'Content-Type': 'application/xml',
      Authorization: 'Bearer newtoken456',
    };

    const headers = setupHeaders(defaultHeaders, configHeaders);

    expect(headers.get('Content-Type')).toBe('application/xml');
    expect(headers.get('Authorization')).toBe('Bearer newtoken456');
  });

  it('should handle null/undefined values in config headers', () => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const configHeaders: Record<string, string | null | undefined> = {
      'X-API-Key': null,
      Accept: undefined,
      Authorization: 'Bearer token123',
    };

    const headers = setupHeaders(defaultHeaders, configHeaders as any);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-API-Key')).toBeNull();
    expect(headers.get('Accept')).toBeNull();
    expect(headers.get('Authorization')).toBe('Bearer token123');
  });

  it('should handle Headers object as input', () => {
    const defaultHeaders = new Headers({
      'Content-Type': 'application/json',
    });

    const configHeaders = new Headers({
      Authorization: 'Bearer token123',
    });

    const headers = setupHeaders(defaultHeaders, configHeaders);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token123');
  });

  it('should handle array format headers', () => {
    const defaultHeaders: [string, string][] = [
      ['Content-Type', 'application/json'],
      ['Authorization', 'Bearer token123'],
    ];

    const configHeaders: [string, string][] = [['X-API-Key', 'key123']];

    const headers = setupHeaders(defaultHeaders, configHeaders);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token123');
    expect(headers.get('X-API-Key')).toBe('key123');
  });
});
