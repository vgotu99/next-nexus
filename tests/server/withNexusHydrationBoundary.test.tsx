import React from 'react';

describe('withNexusHydrationBoundary HOC', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('wraps the page and sets a descriptive displayName', async () => {
    const { withNexusHydrationBoundary } =
      require('@/server/withNexusHydrationBoundary') as typeof import('@/server/withNexusHydrationBoundary');
    const { NexusHydrationBoundary } =
      require('@/server/NexusHydrationBoundary') as typeof import('@/server/NexusHydrationBoundary');

    const Page = (() => <div data-testid='page'>ok</div>) as any;
    Page.displayName = 'TestPage';

    const Wrapped = withNexusHydrationBoundary(Page);

    expect(Wrapped.displayName).toBe('withNexusHydrationBoundary(TestPage)');

    const el = await Wrapped({});
    expect(el.type).toBe(NexusHydrationBoundary);
    const child = (el as any).props.children;
    expect(child.type).toBe(Page);
  });
});
