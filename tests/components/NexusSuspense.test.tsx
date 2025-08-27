/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';

jest.mock('@/scope/renderRegistry', () => ({
  runWithDelegationEnabled: jest.fn((cb: any) => cb()),
}));

describe('NexusSuspense', () => {
  it('wraps children via runWithDelegationEnabled', () => {
    const { NexusSuspense } = require('@/components/NexusSuspense');
    const { runWithDelegationEnabled } = require('@/scope/renderRegistry');

    const { getByText } = render(
      <NexusSuspense fallback={<div>loading</div>}>
        <div>child</div>
      </NexusSuspense>
    );

    expect(getByText('child')).toBeTruthy();
    expect(runWithDelegationEnabled).toHaveBeenCalledTimes(1);
  });
});
