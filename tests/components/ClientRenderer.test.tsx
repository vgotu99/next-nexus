import { render } from '@testing-library/react';

import { clientCacheStore } from '@/cache/clientCacheStore';
import {
  GroupDefinitionsClientRenderer,
  SingleDefinitionClientRenderer,
} from '@/components/ClientRenderer';
import { generateCacheKeyFromDefinition } from '@/utils/cacheUtils';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('ClientRenderer', () => {
  it('SingleDefinitionClientRenderer renders client component with data from cache', () => {
    const def = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/client-one',
      client: { revalidate: 60, tags: ['c'] },
    };
    const key = generateCacheKeyFromDefinition(def as any);
    clientCacheStore.set(key, {
      data: { ok: true },
      clientRevalidate: 60,
      clientTags: ['c'],
      serverTags: [],
      source: 'manual',
    });

    const ClientComp = jest.fn(({ data }: { data: { ok: boolean } }) => (
      <div data-testid='client-one'>{String(data.ok)}</div>
    ));

    const { getByTestId } = render(
      <SingleDefinitionClientRenderer
        definition={def as any}
        clientComponent={ClientComp as any}
      />
    );

    expect(getByTestId('client-one').textContent).toBe('true');
    expect(ClientComp).toHaveBeenCalled();
  });

  it('GroupDefinitionsClientRenderer collects only cached values and passes to component', () => {
    const defA = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/a',
      client: { revalidate: 60, tags: [] },
    };
    const defB = {
      method: 'GET' as const,
      baseURL: 'http://localhost',
      endpoint: '/api/b',
      client: { revalidate: 60, tags: [] },
    };
    const kA = generateCacheKeyFromDefinition(defA as any);
    clientCacheStore.set(kA, {
      data: { a: 1 },
      clientRevalidate: 60,
      clientTags: [],
      serverTags: [],
      source: 'manual',
    });

    const ClientComp = jest.fn(({ data }: { data: Record<string, any> }) => (
      <div data-testid='group'>{Object.keys(data).join(',')}</div>
    ));

    const { getByTestId } = render(
      <GroupDefinitionsClientRenderer
        definitions={{ A: defA as any, B: defB as any }}
        clientComponent={ClientComp as any}
      />
    );

    expect(getByTestId('group').textContent).toBe('A');
  });
});
