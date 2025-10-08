import { validateQueryDefinition } from '@/hooks/core/queryValidator';

describe('queryValidator', () => {
  it('throws when definition is missing', () => {
    expect(() => validateQueryDefinition(undefined as any, 'useX')).toThrow(
      'useX: definition is required'
    );
  });

  it('throws when non-GET definition is provided', () => {
    const def = { method: 'POST', endpoint: '/x' } as any;
    expect(() => validateQueryDefinition(def, 'useX')).toThrow(
      'useX only accepts GET definitions'
    );
  });

  it('throws when endpoint is empty', () => {
    const def = { method: 'GET', endpoint: '' } as any;
    expect(() => validateQueryDefinition(def, 'useX')).toThrow(
      'useX: definition.endpoint must be a non-empty string'
    );
  });

  it('returns the definition when valid', () => {
    const def = { method: 'GET', endpoint: '/ok' } as any;
    expect(validateQueryDefinition(def, 'useX')).toBe(def);
  });
});
