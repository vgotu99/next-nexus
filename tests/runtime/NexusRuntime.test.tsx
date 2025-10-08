import { render } from '@testing-library/react';
import React from 'react';

jest.mock('@/core/NexusRscInitializer', () => ({
  NexusRscInitializer: jest.fn(() => <div data-testid='rsc-init' />),
}));

jest.mock('@/client/NexusHydrator', () => ({
  NexusHydrator: jest.fn(({ maxSize }: { maxSize?: number }) => (
    <div data-testid='hydrator'>{maxSize}</div>
  )),
}));

import { NexusRuntime } from '@/runtime/NexusRuntime';

describe('NexusRuntime', () => {
  it('renders NexusRscInitializer and NexusHydrator with maxSize', () => {
    const { getByTestId } = render(<NexusRuntime maxSize={77} />);
    expect(getByTestId('rsc-init')).toBeTruthy();
    expect(getByTestId('hydrator').textContent).toBe('77');
  });
});
