import {
  createNexusDefinition,
  isGetDefinition,
  isMutationDefinition,
} from '@/utils/definitionUtils';

describe('definitionUtils', () => {
  it('merges base options, headers (removing "null"/"undefined"), and server/client options', () => {
    const make = createNexusDefinition({
      baseURL: 'http://api',
      headers: { 'X-Foo': '1', 'X-Remove-Me': '1' },
      server: { revalidate: 60, tags: ['a'] },
      client: { revalidate: 10, tags: ['c1'], cachedHeaders: ['etag'] },
    });

    const def = make<{ ok: boolean }>({
      method: 'GET',
      endpoint: '/users',
      headers: {
        'X-Bar': '2',
        'X-Remove-Me': 'null',
        'X-Also-Remove': 'undefined',
      },
      server: { tags: ['b'] },
      client: { tags: ['c2'], cachedHeaders: ['age'] },
    });

    expect(def.baseURL).toBe('http://api');

    const headers = new Headers(def.headers);
    expect(headers.get('X-Bar')).toBe('2');
    expect(headers.get('X-Foo')).toBe('1');
    expect(headers.has('X-Remove-Me')).toBe(false);
    expect(headers.has('X-Also-Remove')).toBe(false);

    expect(def.server?.revalidate).toBe(60);
    expect(def.server?.tags).toEqual(['a', 'b']);

    expect(def.client?.revalidate).toBe(10);
    expect(def.client?.tags).toEqual(['c1', 'c2']);
    expect(def.client?.cachedHeaders).toEqual(['etag', 'age']);

    expect(isGetDefinition(def)).toBe(true);
    expect(isMutationDefinition(def)).toBe(false);
  });

  it('validateConfig throws on missing method/endpoint or unsupported method', () => {
    const make = createNexusDefinition();

    expect(() => make({ method: 'GET', endpoint: '' } as any)).toThrow(
      'Endpoint is required'
    );
    expect(() => make({ method: '' as any, endpoint: '/x' } as any)).toThrow(
      'Method is required'
    );
    expect(() => make({ method: 'TRACE' as any, endpoint: '/x' })).toThrow(
      'Unsupported HTTP method: TRACE'
    );
  });
});
