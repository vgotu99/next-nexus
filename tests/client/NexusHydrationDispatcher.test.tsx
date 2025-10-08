import { render } from '@testing-library/react';

import { NexusHydrationDispatcher } from '@/client/NexusHydrationDispatcher';

jest.mock('@/utils/environmentUtils', () => ({
  isClientEnvironment: () => true,
  isServerEnvironment: () => false,
  isDevelopment: () => false,
}));

describe('NexusHydrationDispatcher', () => {
  it('dispatches nexus:hydrate with payload detail on mount', () => {
    const handler = jest.fn();
    window.addEventListener('nexus:hydrate', handler as any);

    const payload = {
      hydrationData: {},
      notModifiedKeys: [],
      pathname: '/',
    } as const;

    render(<NexusHydrationDispatcher payload={payload} />);

    expect(handler).toHaveBeenCalled();
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual(payload);
  });
});
